// lib/notificationSystem.ts
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  doc,
  deleteDoc 
} from 'firebase/firestore';
import { db } from './firebase';

// 1. Salvare subscription când un cetățean activează notificările
export async function saveSubscription(subscription: PushSubscription, deviceInfo?: any) {
  try {
    // Verifică dacă există deja
    const q = query(
      collection(db, 'push_subscriptions'),
      where('endpoint', '==', subscription.endpoint)
    );
    const existing = await getDocs(q);
    
    if (!existing.empty) {
      // Update existing
      const docId = existing.docs[0].id;
      await updateDoc(doc(db, 'push_subscriptions', docId), {
        updatedAt: new Date(),
        ...deviceInfo
      });
      return docId;
    }
    
    // Create new
    const docRef = await addDoc(collection(db, 'push_subscriptions'), {
      subscription: subscription.toJSON(),
      endpoint: subscription.endpoint,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      ...deviceInfo
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
}

// 2. Funcție pentru admin să trimită notificări la toți
export async function sendNotificationToAll(
  title: string, 
  message: string, 
  options?: {
    url?: string;
    icon?: string;
    badge?: string;
    category?: 'urgent' | 'event' | 'info' | 'general';
  }
) {
  try {
    // Get toate subscription-urile active
    const q = query(
      collection(db, 'push_subscriptions'),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);
    
    const subscriptions = snapshot.docs.map(doc => {
      const data = doc.data();
      // Handle both old and new subscription formats
      if (data.subscription) {
        // Old format with nested subscription object
        return {
          id: doc.id,
          ...data.subscription
        };
      } else {
        // New format with flat structure
        return {
          id: doc.id,
          endpoint: data.endpoint,
          keys: data.keys
        };
      }
    });
    
    console.log(`Trimit notificări la ${subscriptions.length} utilizatori...`);
    
    // Trimite în batch-uri de 100 (pentru a nu supraîncărca)
    const batchSize = 100;
    const results = { success: 0, failed: 0 };
    
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      
      try {
        const response = await fetch('/api/push-send/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            message,
            url: options?.url || '/',
            icon: options?.icon,
            badge: options?.badge,
            subscriptionsList: batch
          })
        });

        if (!response.ok) {
          console.error(`[notificationSystem] API returned ${response.status}: ${response.statusText}`);
          const text = await response.text();
          console.error(`[notificationSystem] Response body: ${text}`);
          results.failed += batch.length;
          continue;
        }

        const result = await response.json();
        results.success += result.sent || 0;
        results.failed += result.failed || 0;
      } catch (batchError) {
        console.error(`[notificationSystem] Batch send error:`, batchError);
        results.failed += batch.length;
      }
      
      // Așteaptă puțin între batch-uri
      if (i + batchSize < subscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Salvează în istoricul de notificări
    await addDoc(collection(db, 'notification_history'), {
      title,
      message,
      options,
      sentAt: new Date(),
      recipients: subscriptions.length,
      success: results.success,
      failed: results.failed,
      sentBy: 'admin' // sau user ID-ul admin-ului
    });
    
    return results;
  } catch (error) {
    console.error('Error sending notifications:', error);
    throw error;
  }
}

// 3. Funcție pentru a trimite notificări targeted (ex: doar unui sat)
export async function sendNotificationToGroup(
  title: string,
  message: string,
  filter: {
    village?: string;
    category?: string;
    tags?: string[];
  },
  options?: any
) {
  try {
    let q = query(
      collection(db, 'push_subscriptions'),
      where('active', '==', true)
    );
    
    // Aplică filtre dacă există
    if (filter.village) {
      q = query(q, where('village', '==', filter.village));
    }
    
    const snapshot = await getDocs(q);
    const subscriptions = snapshot.docs.map(doc => {
      const data = doc.data();
      // Handle both old and new subscription formats
      if (data.subscription) {
        return data.subscription;
      } else {
        return {
          endpoint: data.endpoint,
          keys: data.keys
        };
      }
    });
    
    // Similar cu sendNotificationToAll dar cu filtre
    console.log(`Trimit la ${subscriptions.length} utilizatori din grupul selectat`);
    
    // ... rest of implementation similar to sendNotificationToAll
  } catch (error) {
    console.error('Error sending group notifications:', error);
    throw error;
  }
}

// 4. Curăță subscription-urile inactive
export async function cleanupInactiveSubscriptions() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const q = query(
      collection(db, 'push_subscriptions'),
      where('updatedAt', '<', thirtyDaysAgo)
    );
    
    const snapshot = await getDocs(q);
    
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    console.log(`Cleaned up ${snapshot.size} inactive subscriptions`);
    return snapshot.size;
  } catch (error) {
    console.error('Error cleaning subscriptions:', error);
    throw error;
  }
}