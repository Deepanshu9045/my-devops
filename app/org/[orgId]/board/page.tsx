"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Member, Organization, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { OrgSidebar } from "@/components/OrgSidebar";
import { statusOrder, statusLabels } from "@/lib/firestore";

type BoardPageProps = {
  params: { orgId: string };
};

export default function BoardPage({ params }: BoardPageProps) {
  return (
    <ProtectedRoute>
      <BoardContent orgId={params.orgId} />
    </ProtectedRoute>
  );
}

function BoardContent({ orgId }: { orgId: string }) {
  const { user, profile } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [labels, setLabels] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("new");

  useEffect(() => {
    if (!orgId || !user) return;

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
      })
    );

    const tasksQuery = query(
      collection(db, "organizations", orgId, "tasks"),
      orderBy("updatedAt", "desc")
    );

    unsubscribers.push(
      onSnapshot(
        tasksQuery,
        (snapshot) => {
          const nextTasks = snapshot.docs.map((task) => ({
            id: task.id,
            ...(task.data() as Omit<Task, "id">),
          }));

          setTasks(nextTasks);
          setLoadingData(false);
        },
        () => {
          setLoadingData(false);
        }
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [orgId, user]);

  const counts = useMemo(() => {
    return statusOrder.reduce(
      (accumulator, currentStatus) => {
        accumulator[currentStatus] = tasks.filter(
          (task) => task.status === currentStatus
        ).length;

        return accumulator;
      },
      {
        new: 0,
        active: 0,
        staging: 0,
        deployed: 0,
      } as Record<TaskStatus, number>
    );
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    return statusOrder.reduce(
      (accumulator, currentStatus) => {
        accumulator[currentStatus] = tasks.filter(
          (task) => task.status === currentStatus
        );

        return accumulator;
      },
      {
        new: [],
        active: [],
        staging: [],
        deployed: [],
      } as Record<TaskStatus, Task[]>
    );
  }, [tasks]);

  const isAdmin = Boolean(
    user?.uid && organization?.adminIds?.includes(user.uid)
  );

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !orgId) return;

    setSavingTask(true);
    setTaskError("");

    try {
      const assignee = members.find((member) => member.uid === assigneeId);
      const nextLabels = labels
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      await addDoc(collection(db, "organizations", orgId, "tasks"), {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigneeId: assignee?.uid ?? "",
        assigneeName: assignee?.name ?? "",
        labels: nextLabels,
        createdBy: user.uid,
        createdByName:
          profile?.name || user.displayName || user.email || "Contributor",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setTitle("");
      setDescription("");
      setAssigneeId("");
      setLabels("");
      setPriority("medium");
      setStatus("new");
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setTaskError("Failed to create task.");
    } finally {
      setSavingTask(false);
    }
  };

  const handleStatusChange = async (taskId: string, nextStatus: TaskStatus) => {
    if (!orgId) return;

    await updateDoc(doc(db, "organizations", orgId, "tasks", taskId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  };

  const handlePriorityChange = async (
    taskId: string,
    nextPriority: TaskPriority
  ) => {
    if (!orgId) return;

    await updateDoc(doc(db, "organizations", orgId, "tasks", taskId), {
      priority: nextPriority,
      updatedAt: serverTimestamp(),
    });
  };

  if (loadingData) {
    return <div className="center-screen">Loading board...</div>;
  }

  if (!organization) {
    return <div className="center-screen">Organization not found.</div>;
  }

  if (user && !organization.memberIds?.includes(user.uid)) {
    return <div className="center-screen">You do not have access to this organization.</div>;
  }

  return (
    <div className="app-shell">
      <OrgSidebar orgId={orgId} orgName={organization.name} active="board" />

      <main className="workspace">
        <div className="workspace-header">
          <div>
            <p className="breadcrumbs">My DevOps / {organization.name} / Boards</p>
            <h1>{organization.name} Board</h1>
          </div>

          <div className="workspace-actions">
            <Link href={`/org/${orgId}/contributors`} className="secondary-button">
              Contributors
            </Link>
            <button
              className="primary-button"
              onClick={() => setShowForm((value) => !value)}
            >
              {showForm ? "Close form" : "New item"}
            </button>
          </div>
        </div>

        <div className="board-summary">
          {statusOrder.map((columnStatus) => (
            <div key={columnStatus} className="summary-chip">
              <span>{statusLabels[columnStatus]}</span>
              <strong>{counts[columnStatus]}</strong>
            </div>
          ))}
        </div>

        {showForm ? (
          <section className="panel task-form-panel">
            <div className="panel-head">
              <div>
                <h2>Create work item</h2>
                <p>Add a task and assign it to a contributor inside this organization.</p>
              </div>
            </div>

            <form className="task-form-grid" onSubmit={handleCreateTask}>
              <label className="wide-field">
                Title
                <input
                  type="text"
                  placeholder="Hotels filter page"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </label>

              <label className="wide-field">
                Description
                <textarea
                  rows={4}
                  placeholder="Describe the work item"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <label>
                Assign contributor
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.uid} value={member.uid}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as TaskStatus)
                  }
                >
                  {statusOrder.map((item) => (
                    <option key={item} value={item}>
                      {statusLabels[item]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Priority
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as TaskPriority)
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>

              <label>
                Labels
                <input
                  type="text"
                  placeholder="design, mobile, api"
                  value={labels}
                  onChange={(event) => setLabels(event.target.value)}
                />
              </label>

              {taskError ? <p className="error-text wide-field">{taskError}</p> : null}

              <div className="wide-field form-actions">
                <button type="submit" className="primary-button" disabled={savingTask}>
                  {savingTask ? "Saving..." : "Create task"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <div className="board-grid">
          {statusOrder.map((columnStatus) => (
            <section key={columnStatus} className="board-column">
              <div className="board-column-head">
                <div>
                  <h2>{statusLabels[columnStatus]}</h2>
                  <p>{counts[columnStatus]} items</p>
                </div>
              </div>

              <div className="board-column-list">
                {groupedTasks[columnStatus].length === 0 ? (
                  <div className="task-empty">No work items here.</div>
                ) : (
                  groupedTasks[columnStatus].map((task) => (
                    <article
                      key={task.id}
                      className={`task-card priority-${task.priority}`}
                    >
                      <div className="task-card-top">
                        <div className="task-icon">▦</div>
                        <div>
                          <h3>{task.title}</h3>
                          <p>{task.description || "No description added yet."}</p>
                        </div>
                      </div>

                      <div className="task-meta">
                        <div className="avatar-badge">
                          {task.assigneeName
                            ? task.assigneeName
                                .split(" ")
                                .map((item) => item.charAt(0))
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                            : "NA"}
                        </div>
                        <span>{task.assigneeName || "Unassigned"}</span>
                      </div>

                      {task.labels?.length ? (
                        <div className="label-row">
                          {task.labels.map((label) => (
                            <span key={label} className="label-chip">
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="task-actions">
                        <label>
                          Status
                          <select
                            value={task.status}
                            onChange={(event) =>
                              handleStatusChange(
                                task.id,
                                event.target.value as TaskStatus
                              )
                            }
                          >
                            {statusOrder.map((item) => (
                              <option key={item} value={item}>
                                {statusLabels[item]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Priority
                          <select
                            value={task.priority}
                            onChange={(event) =>
                              handlePriorityChange(
                                task.id,
                                event.target.value as TaskPriority
                              )
                            }
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        </label>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>

        {!isAdmin ? (
          <p className="page-note">
            Contributor management is restricted to organization admins.
          </p>
        ) : null}
      </main>
    </div>
  );
}
