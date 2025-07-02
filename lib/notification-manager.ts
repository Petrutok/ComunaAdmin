// lib/notification-manager.ts
export class NotificationManager {
  private static subscriptions: PushSubscription[] = [];

  static async addSubscription(subscription: PushSubscription) {
    // Check if already exists
    const exists = this.subscriptions.find(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (!exists) {
      this.subscriptions.push(subscription);
      
      // Store in localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem('push_subscriptions', JSON.stringify(this.subscriptions));
      }
    }
  }

  static async removeSubscription(endpoint: string) {
    this.subscriptions = this.subscriptions.filter(
      sub => sub.endpoint !== endpoint
    );
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('push_subscriptions', JSON.stringify(this.subscriptions));
    }
  }

  static getSubscriptions(): PushSubscription[] {
    // Load from localStorage if empty
    if (this.subscriptions.length === 0 && typeof window !== 'undefined') {
      const stored = localStorage.getItem('push_subscriptions');
      if (stored) {
        try {
          this.subscriptions = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse stored subscriptions');
        }
      }
    }
    
    return this.subscriptions;
  }

  static async sendToAll(title: string, message: string, url?: string) {
    const subscriptions = this.getSubscriptions();
    
    const response = await fetch('/api/push-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        message,
        url,
        subscriptionsList: subscriptions
      })
    });
    
    return response.json();
  }
}