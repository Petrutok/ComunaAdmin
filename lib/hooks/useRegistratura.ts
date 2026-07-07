// lib/hooks/useRegistratura.ts
// Data layer for the registratura module: loading, mutations and derived
// stats live here so the page and components stay purely presentational.
//
// Performance model: one initial fetch, then OPTIMISTIC local updates on
// every mutation (no full reloads). At commune volume (hundreds-thousands
// of documents/year) client-side filtering/sorting over the loaded set is
// instant and gives "search-as-you-type" for free.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { calculateDeadline } from '@/lib/utils/deadline-utils';
import { logActivity } from '@/lib/registratura/audit';
import {
  RegistraturaEmail,
  EmailStatus,
  EmailPriority,
  EMAIL_STATUS_CONFIG,
  OPEN_STATUSES,
} from '@/types/registratura';
import { Department, User } from '@/types/departments';

// Most recent N documents; older history stays queryable via Firestore
// console/exports. Keeps first paint fast even after years of usage.
const LOAD_LIMIT = 1000;

export function useRegistratura() {
  const { user: adminUser } = useAdminAuth();
  const [emails, setEmails] = useState<RegistraturaEmail[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const actor = useMemo(
    () => ({
      autorId: adminUser?.uid || 'necunoscut',
      autorNume: adminUser?.email || 'Utilizator',
    }),
    [adminUser]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emailsSnap, deptSnap, usersSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, COLLECTIONS.REGISTRATURA_EMAILS),
            orderBy('dateReceived', 'desc'),
            limit(LOAD_LIMIT)
          )
        ),
        getDocs(query(collection(db, COLLECTIONS.DEPARTMENTS), orderBy('name', 'asc'))),
        getDocs(query(collection(db, COLLECTIONS.USERS), orderBy('fullName', 'asc'))),
      ]);
      setEmails(emailsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RegistraturaEmail)));
      setDepartments(deptSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Department)));
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Apply a partial update locally (optimistic) - the UI reacts instantly. */
  const patchLocal = useCallback((id: string, patch: Partial<RegistraturaEmail>) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const updateStatus = useCallback(
    async (email: RegistraturaEmail, status: EmailStatus, observatii?: string) => {
      const patch: Partial<RegistraturaEmail> & Record<string, unknown> = {
        status,
        updatedAt: Timestamp.now(),
      };
      if (observatii !== undefined && observatii.trim()) {
        patch.observatii = observatii.trim();
      }
      patchLocal(email.id, patch);
      await updateDoc(doc(db, COLLECTIONS.REGISTRATURA_EMAILS, email.id), patch);
      logActivity({
        emailId: email.id,
        tip: 'status',
        mesaj: `Status: ${EMAIL_STATUS_CONFIG[email.status]?.label || email.status} → ${EMAIL_STATUS_CONFIG[status].label}`,
        ...actor,
      });
    },
    [actor, patchLocal]
  );

  const assign = useCallback(
    async (
      email: RegistraturaEmail,
      departmentId: string | null,
      userId: string | null,
      priority: EmailPriority
    ) => {
      const department = departments.find((d) => d.id === departmentId);
      const assignee = users.find((u) => u.id === userId);
      const patch: Record<string, unknown> = {
        assignedToUserId: userId,
        assignedToUserName: assignee?.fullName || null,
        departmentId,
        departmentName: department?.name || null,
        priority,
        deadline: calculateDeadline(priority),
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      // First assignment moves the document into the workflow
      if (!email.assignedToUserId && (userId || departmentId)) {
        patch.status = 'repartizata';
      }
      patchLocal(email.id, patch as Partial<RegistraturaEmail>);
      await updateDoc(doc(db, COLLECTIONS.REGISTRATURA_EMAILS, email.id), patch);
      logActivity({
        emailId: email.id,
        tip: 'atribuire',
        mesaj: `Repartizat: ${[department?.name, assignee?.fullName].filter(Boolean).join(' / ') || 'nimeni'} · prioritate ${priority}`,
        ...actor,
      });
    },
    [actor, departments, users, patchLocal]
  );

  const setTags = useCallback(
    async (email: RegistraturaEmail, etichete: string[]) => {
      patchLocal(email.id, { etichete });
      await updateDoc(doc(db, COLLECTIONS.REGISTRATURA_EMAILS, email.id), { etichete });
      logActivity({
        emailId: email.id,
        tip: 'eticheta',
        mesaj: etichete.length ? `Etichete: ${etichete.join(', ')}` : 'Etichete eliminate',
        ...actor,
      });
    },
    [actor, patchLocal]
  );

  const addComment = useCallback(
    async (email: RegistraturaEmail, text: string) => {
      await logActivity({ emailId: email.id, tip: 'comentariu', mesaj: text.trim(), ...actor });
    },
    [actor]
  );

  const remove = useCallback(async (email: RegistraturaEmail) => {
    setEmails((prev) => prev.filter((e) => e.id !== email.id));
    await deleteDoc(doc(db, COLLECTIONS.REGISTRATURA_EMAILS, email.id));
  }, []);

  const bulkUpdateStatus = useCallback(
    async (targets: RegistraturaEmail[], status: EmailStatus) => {
      await Promise.all(targets.map((email) => updateStatus(email, status)));
    },
    [updateStatus]
  );

  // ---- Derived stats for the dashboard ---------------------------------
  const stats = useMemo(() => {
    const now = Date.now();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const isOpen = (e: RegistraturaEmail) => OPEN_STATUSES.includes(e.status);
    const overdue = emails.filter(
      (e) => isOpen(e) && e.deadline?.toMillis && e.deadline.toMillis() < now
    );
    const dueSoon = emails.filter((e) => {
      if (!isOpen(e) || !e.deadline?.toMillis) return false;
      const ms = e.deadline.toMillis() - now;
      return ms >= 0 && ms <= 3 * 24 * 60 * 60 * 1000;
    });
    return {
      noi: emails.filter((e) => e.status === 'nou').length,
      inLucru: emails.filter((e) => isOpen(e) && e.status !== 'nou').length,
      solutionateLuna: emails.filter(
        (e) =>
          (e.status === 'rezolvat' || e.status === 'respins') &&
          (e.updatedAt?.toMillis?.() || 0) >= monthStart
      ).length,
      depasite: overdue,
      expiraCurand: dueSoon.sort(
        (a, b) => (a.deadline?.toMillis?.() || 0) - (b.deadline?.toMillis?.() || 0)
      ),
    };
  }, [emails]);

  return {
    emails,
    departments,
    users,
    loading,
    stats,
    reload: load,
    updateStatus,
    assign,
    setTags,
    addComment,
    remove,
    bulkUpdateStatus,
  };
}
