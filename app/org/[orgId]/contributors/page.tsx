"use client";

import { FormEvent, useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Member, Organization } from "@/lib/types";
import { OrgSidebar } from "@/components/OrgSidebar";

type ContributorPageProps = {
  params: { orgId: string };
};

export default function ContributorsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = use(params);

  return (
    <ProtectedRoute>
      <ContributorsContent orgId={orgId} />
    </ProtectedRoute>
  );
}

function ContributorsContent({ orgId }: { orgId: string }) {
  const { user, profile } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId) return;

    const unsubscribers: Array<() => void> = [];

    unsubscribers.push(
      onSnapshot(doc(db, "organizations", orgId), (snapshot) => {
        if (!snapshot.exists()) {
          setOrganization(null);
          setLoadingData(false);
          return;
        }

        setOrganization({
          id: snapshot.id,
          ...(snapshot.data() as Omit<Organization, "id">),
        });
      })
    );

    unsubscribers.push(
      onSnapshot(collection(db, "organizations", orgId, "members"), (snapshot) => {
        const nextMembers = snapshot.docs.map((member) => ({
          uid: member.id,
          ...(member.data() as Omit<Member, "uid">),
        }));

        setMembers(nextMembers);
        setLoadingData(false);
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [orgId]);

  const isAdmin = Boolean(
    user?.uid && organization?.adminIds?.includes(user.uid)
  );

  const adminCount = useMemo(
    () => members.filter((member) => member.role === "admin").length,
    [members]
  );

  const handleAddContributor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin || !orgId || !organization) return;

    setAdding(true);
    setError("");
    setMessage("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error("Please enter an email address.");
      }

      const profileQuery = query(
        collection(db, "profiles"),
        where("lowercaseEmail", "==", normalizedEmail)
      );

      const profileSnapshot = await getDocs(profileQuery);

      if (profileSnapshot.empty) {
        throw new Error("This contributor must register first before you can add them.");
      }

      const contributorProfile = profileSnapshot.docs[0].data() as {
        uid: string;
        name: string;
        email: string;
      };

      if (organization.memberIds?.includes(contributorProfile.uid)) {
        throw new Error("This contributor is already part of the organization.");
      }

      const batch = writeBatch(db);

      batch.update(doc(db, "organizations", orgId), {
        memberIds: arrayUnion(contributorProfile.uid),
      });

      batch.set(doc(db, "organizations", orgId, "members", contributorProfile.uid), {
        uid: contributorProfile.uid,
        name: contributorProfile.name,
        email: contributorProfile.email,
        role: "contributor",
        joinedAt: serverTimestamp(),
      });

      await batch.commit();

      setMessage(`${contributorProfile.name} was added as a contributor.`);
      setEmail("");
    } catch (err) {
      const nextError =
        err instanceof Error ? err.message : "Failed to add contributor.";
      setError(nextError);
    } finally {
      setAdding(false);
    }
  };

  const handleMakeAdmin = async (member: Member) => {
    if (!orgId || !organization || !isAdmin) return;

    const batch = writeBatch(db);

    batch.update(doc(db, "organizations", orgId), {
      adminIds: arrayUnion(member.uid),
    });

    batch.update(doc(db, "organizations", orgId, "members", member.uid), {
      role: "admin",
    });

    await batch.commit();
  };

  const handleRemoveAdmin = async (member: Member) => {
    if (!orgId || !organization || !isAdmin) return;
    if (member.uid === user?.uid) {
      setError("You cannot remove your own admin access from this screen.");
      return;
    }
    if (adminCount <= 1) {
      setError("At least one admin must remain in the organization.");
      return;
    }

    const batch = writeBatch(db);

    batch.update(doc(db, "organizations", orgId), {
      adminIds: arrayRemove(member.uid),
    });

    batch.update(doc(db, "organizations", orgId, "members", member.uid), {
      role: "contributor",
    });

    await batch.commit();
  };

  const handleRemoveContributor = async (member: Member) => {
    if (!orgId || !organization || !isAdmin) return;

    if (member.uid === user?.uid) {
      setError("Use another admin account before removing yourself.");
      return;
    }

    if (member.role === "admin" && adminCount <= 1) {
      setError("At least one admin must remain in the organization.");
      return;
    }

    await updateDoc(doc(db, "organizations", orgId), {
      memberIds: arrayRemove(member.uid),
      ...(member.role === "admin" ? { adminIds: arrayRemove(member.uid) } : {}),
    });

    await deleteDoc(doc(db, "organizations", orgId, "members", member.uid));
  };

  if (loadingData) {
    return <div className="center-screen">Loading contributors...</div>;
  }

  if (!organization) {
    return <div className="center-screen">Organization not found.</div>;
  }

  if (user && !organization.memberIds?.includes(user.uid)) {
    return <div className="center-screen">You do not have access to this organization.</div>;
  }

  return (
    <div className="app-shell">
      <OrgSidebar orgId={orgId} orgName={organization.name} active="contributors" />

      <main className="workspace">
        <div className="workspace-header">
          <div>
            <p className="breadcrumbs">
              My DevOps / {organization.name} / Contributors
            </p>
            <h1>Contributors</h1>
          </div>

          <div className="workspace-actions">
            <Link href={`/org/${orgId}/board`} className="secondary-button">
              Back to board
            </Link>
          </div>
        </div>

        <div className="dashboard-grid contributors-layout">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Organization members</h2>
                <p>Admins can promote contributors or remove members.</p>
              </div>
            </div>

            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.uid}>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>
                        <span className="role-chip">{member.role}</span>
                      </td>
                      <td>
                        <div className="inline-actions">
                          {isAdmin && member.role !== "admin" ? (
                            <button
                              className="secondary-button small-button"
                              onClick={() => handleMakeAdmin(member)}
                            >
                              Make admin
                            </button>
                          ) : null}

                          {isAdmin && member.role === "admin" ? (
                            <button
                              className="secondary-button small-button"
                              onClick={() => handleRemoveAdmin(member)}
                            >
                              Make contributor
                            </button>
                          ) : null}

                          {isAdmin ? (
                            <button
                              className="danger-button small-button"
                              onClick={() => handleRemoveContributor(member)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No members found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="panel">
            <div className="panel-head">
              <div>
                <h2>Add contributor</h2>
                <p>Only admins can add registered users to the organization.</p>
              </div>
            </div>

            {isAdmin ? (
              <form className="stack-form" onSubmit={handleAddContributor}>
                <label>
                  Contributor email
                  <input
                    type="email"
                    placeholder="contributor@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>

                {message ? <p className="success-text">{message}</p> : null}
                {error ? <p className="error-text">{error}</p> : null}

                <button type="submit" className="primary-button" disabled={adding}>
                  {adding ? "Adding..." : "Add contributor"}
                </button>

                <p className="helper-text">
                  Current admin: {profile?.name || user?.displayName || user?.email}
                </p>
              </form>
            ) : (
              <div className="empty-state">
                <h3>Admin only</h3>
                <p>Only organization admins can add or remove contributors.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
