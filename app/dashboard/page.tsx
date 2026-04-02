"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Organization } from "@/lib/types";
import { createStarterTasks, slugify } from "@/lib/firestore";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const orgQuery = query(
      collection(db, "organizations"),
      where("memberIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(orgQuery, (snapshot) => {
      const nextOrganizations = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Organization, "id">),
      }));

      setOrganizations(nextOrganizations);
    });

    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    const adminCount = organizations.filter((item) =>
      item.adminIds?.includes(user?.uid ?? "")
    ).length;

    return {
      totalOrgs: organizations.length,
      adminOrgs: adminCount,
    };
  }, [organizations, user?.uid]);

  const handleCreateOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) return;

    setCreating(true);
    setError("");

    try {
      const orgRef = doc(collection(db, "organizations"));
      const memberRef = doc(db, "organizations", orgRef.id, "members", user.uid);
      const batch = writeBatch(db);

      const orgName = name.trim();
      const displayName =
        profile?.name || user.displayName || user.email || "Admin";

      batch.set(orgRef, {
        name: orgName,
        slug: slugify(orgName),
        createdBy: user.uid,
        adminIds: [user.uid],
        memberIds: [user.uid],
        createdAt: serverTimestamp(),
      });

      batch.set(memberRef, {
        uid: user.uid,
        name: displayName,
        email: user.email,
        role: "admin",
        joinedAt: serverTimestamp(),
      });

      createStarterTasks({
        db,
        batch,
        orgId: orgRef.id,
        createdBy: user.uid,
        createdByName: displayName,
      });

      await batch.commit();
      setName("");
      router.push(`/org/${orgRef.id}/board`);
    } catch (err) {
      console.error(err);
      setError("Failed to create organization. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-top">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>My DevOps organizations</h1>
          <p>
            Create separate organizations and manage contributors inside each one.
          </p>
        </div>

        <button className="secondary-button" onClick={handleSignOut}>
          Sign out
        </button>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-main">
          <div className="stats-grid">
            <div className="stat-card">
              <span>Total organizations</span>
              <strong>{stats.totalOrgs}</strong>
            </div>
            <div className="stat-card">
              <span>Organizations you admin</span>
              <strong>{stats.adminOrgs}</strong>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Your organizations</h2>
                <p>Open a board or manage contributors for each organization.</p>
              </div>
            </div>

            {organizations.length === 0 ? (
              <div className="empty-state">
                <h3>No organizations yet</h3>
                <p>Create your first organization to start managing boards and contributors.</p>
              </div>
            ) : (
              <div className="org-grid">
                {organizations.map((organization) => (
                  <article key={organization.id} className="org-card">
                    <div className="org-card-head">
                      <div>
                        <h3>{organization.name}</h3>
                        <p>@{organization.slug}</p>
                      </div>
                      <span className="mini-chip">
                        {organization.memberIds?.length ?? 0} members
                      </span>
                    </div>

                    <div className="org-card-actions">
                      <Link
                        className="primary-button"
                        href={`/org/${organization.id}/board`}
                      >
                        Open board
                      </Link>
                      <Link
                        className="secondary-button"
                        href={`/org/${organization.id}/contributors`}
                      >
                        Contributors
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="panel create-org-panel">
          <div className="panel-head">
            <div>
              <h2>Create organization</h2>
              <p>Your account can create and manage multiple org workspaces.</p>
            </div>
          </div>

          <form className="stack-form" onSubmit={handleCreateOrganization}>
            <label>
              Organization name
              <input
                type="text"
                placeholder="PulseZest Engineering"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

            {error ? <p className="error-text">{error}</p> : null}

            <button type="submit" className="primary-button" disabled={creating}>
              {creating ? "Creating..." : "Create organization"}
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}
