export const theorySubjects = [
  "Discrete Mathematics Structure",
  "Managerial Economics",
  "Microprocessor and Interfaces",
  "DBMS",
  "Theory of Computation"
];

export const labSubjects = [
  "Microprocessor and Interfaces Lab",
  "DBMS Lab",
  "Network Programming Lab"
];

export type FileType = "image" | "pdf";

export type AssignmentCard = {
  id: string;
  subject: string;
  title: string;
  description: string;
  uploadedAt: string;
  fileType: FileType;
  url: string;
  preview?: string;
};

export const seedAssignments: AssignmentCard[] = [
  {
    id: "seed-1",
    subject: "DBMS",
    title: "ER Diagrams and Normal Forms",
    description: "Concise ERD set with 3NF proof sketches.",
    uploadedAt: new Date().toISOString(),
    fileType: "pdf",
    url: "#",
    preview: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "seed-2",
    subject: "Network Programming Lab",
    title: "Socket Mini Suite",
    description: "TCP echo, UDP chat, and graceful teardown notes.",
    uploadedAt: new Date().toISOString(),
    fileType: "image",
    url: "#",
    preview: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "seed-3",
    subject: "Theory of Computation",
    title: "Pumping Lemma Cheatsheet",
    description: "Compact proofs and DFA sketches for quick recall.",
    uploadedAt: new Date().toISOString(),
    fileType: "pdf",
    url: "#",
    preview: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
  }
];
