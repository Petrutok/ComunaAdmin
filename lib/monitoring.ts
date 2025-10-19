import { Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

interface LogEntry {
  timestamp: Timestamp;
  action: string;
  details: any;
  success: boolean;
  error?: string;
}

export class MonitoringService {
  async logEmailFetch(result: any) {
    const logEntry: LogEntry = {
      timestamp: Timestamp.now(),
      action: 'email_fetch',
      details: {
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors
      },
      success: result.success
    };

    await addDoc(collection(db, 'system_logs'), logEntry);
  }

  async updateLastFetch() {
    await setDoc(doc(db, 'config', 'email_fetch'), {
      lastRun: Timestamp.now(),
      status: 'success'
    }, { merge: true });
  }
}