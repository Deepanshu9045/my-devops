import {
  collection,
  doc,
  serverTimestamp,
  type Firestore,
  type WriteBatch,
} from "firebase/firestore";
import { TaskPriority, TaskStatus } from "@/lib/types";

export const statusOrder: TaskStatus[] = ["new", "active", "staging", "deployed"];

export const statusLabels: Record<TaskStatus, string> = {
  new: "New",
  active: "Active",
  staging: "Staging",
  deployed: "Deployed",
};

const starterTasks: Array<{
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
}> = [
  {
    title: "Hotels filter page",
    description: "Create filters for destination, price, and room availability.",
    status: "new",
    priority: "medium",
    labels: ["frontend", "travel"],
  },
  {
    title: "Guests page",
    description: "Build contributor-facing UI to manage guest information.",
    status: "new",
    priority: "low",
    labels: ["ui", "crud"],
  },
  {
    title: "Home page controls",
    description: "Design button states, responsive spacing, and landing sections.",
    status: "active",
    priority: "medium",
    labels: ["design", "landing"],
  },
  {
    title: "Search component complex features",
    description: "Connect filters with Firestore search-ready data.",
    status: "active",
    priority: "high",
    labels: ["search", "firebase"],
  },
  {
    title: "Login page",
    description: "Refine auth states and show role-specific messaging.",
    status: "staging",
    priority: "blocked",
    labels: ["auth", "role"],
  },
  {
    title: "Notifications list",
    description: "Prepare deploy-ready list layout for system messages.",
    status: "staging",
    priority: "medium",
    labels: ["ux", "notification"],
  },
  {
    title: "Footer",
    description: "Ship final footer, legal links, and contributor credits.",
    status: "deployed",
    priority: "low",
    labels: ["content"],
  },
];

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function createStarterTasks({
  db,
  batch,
  orgId,
  createdBy,
  createdByName,
}: {
  db: Firestore;
  batch: WriteBatch;
  orgId: string;
  createdBy: string;
  createdByName: string;
}) {
  starterTasks.forEach((task) => {
    const taskRef = doc(collection(db, "organizations", orgId, "tasks"));

    batch.set(taskRef, {
      ...task,
      assigneeId: "",
      assigneeName: "",
      createdBy,
      createdByName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}
