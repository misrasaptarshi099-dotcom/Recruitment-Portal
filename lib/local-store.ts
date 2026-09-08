import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "formData.json");

const SEED_APPLICANTS = [
  {
    id: "app_1",
    _id: "app_1",
    Name: "Aarav Sharma",
    RegistrationNumber: "23BCE1042",
    Email: "aarav.sharma2023@vitstudent.ac.in",
    PhoneNumber: "9876543210",
    Department: "Technical",
    shortlisted: true,
    Shortlisted: true,
    Questions: {
      WhyJoin: "Passionate about full-stack web development and distributed systems.",
      PastExperience: "Built multiple Next.js apps, contributed to open-source, Docker.",
      GitHub: "https://github.com/aaravsharma",
    },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "app_2",
    _id: "app_2",
    Name: "Diya Patel",
    RegistrationNumber: "23BDS0214",
    Email: "diya.patel2023@vitstudent.ac.in",
    PhoneNumber: "9823456781",
    Department: "Design",
    shortlisted: false,
    Shortlisted: false,
    Questions: {
      WhyJoin: "Want to design accessible, high-converting interfaces and design systems.",
      PastExperience: "Figma master, created design system for college festival.",
      Portfolio: "https://behance.net/diyapatel",
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "app_3",
    _id: "app_3",
    Name: "Rohan Verma",
    RegistrationNumber: "24BCE2190",
    Email: "rohan.verma2024@vitstudent.ac.in",
    PhoneNumber: "9712345678",
    Department: "AI / ML",
    shortlisted: true,
    Shortlisted: true,
    Questions: {
      WhyJoin: "Excited about LLM agents, LangChain, and fine-tuning open weights.",
      PastExperience: "PyTorch, Hugging Face transformers, RAG pipelines.",
      GitHub: "https://github.com/rohanverma",
    },
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "app_4",
    _id: "app_4",
    Name: "Sneha Nair",
    RegistrationNumber: "24BCB0058",
    Email: "sneha.nair2024@vitstudent.ac.in",
    PhoneNumber: "9654321987",
    Department: "Management",
    shortlisted: false,
    Shortlisted: false,
    Questions: {
      WhyJoin: "Proven track record organizing large-scale hackathons and logistics.",
      PastExperience: "Event lead for Gravitas technical tracks, sponsorship outreach.",
    },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "app_5",
    _id: "app_5",
    Name: "Karthik Iyer",
    RegistrationNumber: "23BIT0129",
    Email: "karthik.iyer2023@vitstudent.ac.in",
    PhoneNumber: "9543216789",
    Department: "Cybersecurity",
    shortlisted: false,
    Shortlisted: false,
    Questions: {
      WhyJoin: "Love penetration testing, CTFs, and API security auditing.",
      PastExperience: "Top 50 in national CTF, TryHackMe top 1%, Wireshark, BurpSuite.",
      GitHub: "https://github.com/karthiksec",
    },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

function getFilePath(collectionName: string = "formData"): string {
  const sanitized = collectionName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_DIR, `${sanitized}.json`);
}

function readData(collectionName: string = "formData"): any[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const targetFile = getFilePath(collectionName);
    if (!fs.existsSync(targetFile)) {
      if (collectionName === "formData") {
        fs.writeFileSync(targetFile, JSON.stringify(SEED_APPLICANTS, null, 2), "utf-8");
        return [...SEED_APPLICANTS];
      }
      fs.writeFileSync(targetFile, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
    const content = fs.readFileSync(targetFile, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Error reading local store collection ${collectionName}:`, err);
    return collectionName === "formData" ? [...SEED_APPLICANTS] : [];
  }
}

function writeData(collectionName: string = "formData", items: any[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const targetFile = getFilePath(collectionName);
    fs.writeFileSync(targetFile, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing to local store collection ${collectionName}:`, err);
  }
}

function createQuery(collectionName: string, items: any[]) {
  return {
    where: (field: string, op: string, val: any) => {
      const filtered = items.filter((item) => {
        if (op === "==") return item[field] === val;
        if (op === "!=") return item[field] !== val;
        if (op === ">") return item[field] > val;
        if (op === "<") return item[field] < val;
        if (op === ">=") return item[field] >= val;
        if (op === "<=") return item[field] <= val;
        if (op === "array-contains") return Array.isArray(item[field]) && item[field].includes(val);
        return true;
      });
      return createQuery(collectionName, filtered);
    },
    get: async () => {
      return {
        docs: items.map((doc) => ({
          id: doc.id || doc._id,
          _id: doc.id || doc._id,
          data: () => ({ ...doc }),
          exists: true,
        })),
        size: items.length,
        empty: items.length === 0,
      };
    },
    select: (..._fields: string[]) => {
      return createQuery(collectionName, items);
    },
    count: () => ({
      get: async () => ({
        data: () => ({ count: items.length }),
      }),
    }),
  };
}

let transactionQueue: Promise<any> = Promise.resolve();

export const localDb = {
  runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
    // Transaction wrapper ensuring serialized read-modify-write atomicity across concurrent calls
    const nextInQueue = transactionQueue.catch(() => {}).then(async () => {
      const transaction = {
        get: async (docRef: any) => {
          return docRef.get();
        },
        set: async (docRef: any, data: any, options?: any) => {
          return docRef.set(data, options);
        },
        update: async (docRef: any, patch: any) => {
          return docRef.update(patch);
        },
        delete: async (docRef: any) => {
          return docRef.delete?.();
        },
      };
      return await updateFunction(transaction);
    });
    transactionQueue = nextInQueue;
    return await nextInQueue;
  },
  collection: (collectionName: string) => {
    return {
      add: async (data: any) => {
        const items = readData(collectionName);
        const id = data.id || data._id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newDoc = {
          id,
          _id: id,
          ...data,
          createdAt: data.createdAt || new Date().toISOString(),
          shortlisted: data.shortlisted ?? false,
          Shortlisted: data.Shortlisted ?? false,
        };
        items.unshift(newDoc);
        writeData(collectionName, items);
        return { id };
      },
      doc: (id: string) => {
        return {
          id,
          get: async () => {
            const items = readData(collectionName);
            const found = items.find((i) => i.id === id || i._id === id);
            return {
              id,
              _id: id,
              exists: Boolean(found),
              data: () => (found ? { ...found } : null),
            };
          },
          update: async (...args: any[]) => {
            const items = readData(collectionName);
            let index = items.findIndex((i) => i.id === id || i._id === id);
            if (index === -1) {
              const newDoc = { id, _id: id, createdAt: new Date().toISOString() };
              items.push(newDoc);
              index = items.length - 1;
            }

            const target = items[index];

            const isDeleteTransform = (val: any) =>
              val &&
              (val.constructor?.name === "DeleteTransform" ||
                val._methodName === "FieldValue.delete" ||
                val === "__DELETE__");

            const applyFieldPath = (segments: string[], value: any) => {
              if (!segments || segments.length === 0) return;
              let curr = target;
              for (let i = 0; i < segments.length - 1; i++) {
                const seg = segments[i];
                if (!curr[seg] || typeof curr[seg] !== "object") {
                  curr[seg] = {};
                }
                curr = curr[seg];
              }
              const lastKey = segments[segments.length - 1];
              if (isDeleteTransform(value)) {
                delete curr[lastKey];
              } else {
                curr[lastKey] = value;
              }
            };

            // Case A: (fieldPath, value, ...) pairs
            if (
              args.length >= 2 &&
              (typeof args[0] === "string" || args[0]?.constructor?.name === "FieldPath" || Array.isArray(args[0]?.segments))
            ) {
              for (let i = 0; i < args.length; i += 2) {
                const rawPath = args[i];
                const val = args[i + 1];
                let segments: string[] = [];
                if (Array.isArray(rawPath?.segments)) {
                  segments = rawPath.segments;
                } else if (typeof rawPath === "string") {
                  segments = rawPath.split(".").map((s) => s.replace(/^`|`$/g, ""));
                }
                applyFieldPath(segments, val);
              }
            } else if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
              // Case B: object map { [fieldPathOrKey]: value }
              const patch = args[0];
              for (const [k, val] of Object.entries(patch)) {
                if (k.includes(".")) {
                  const segments = k.split(".").map((s) => s.replace(/^`|`$/g, ""));
                  applyFieldPath(segments, val);
                } else {
                  if (isDeleteTransform(val)) {
                    delete target[k];
                  } else {
                    target[k] = val;
                  }
                }
              }
              if (patch.shortlisted !== undefined) {
                target.shortlisted = patch.shortlisted;
                target.Shortlisted = patch.shortlisted;
              }
            }

            target.updatedAt = new Date().toISOString();
            writeData(collectionName, items);
            return { writeTime: new Date() };
          },
          set: async (data: any, options?: any) => {
            const items = readData(collectionName);
            const index = items.findIndex((i) => i.id === id || i._id === id);
            if (index >= 0 && options?.merge) {
              const existing = items[index];
              const merged = { ...existing, ...data };
              if (
                existing.departments &&
                data.departments &&
                typeof existing.departments === "object" &&
                typeof data.departments === "object"
              ) {
                merged.departments = { ...existing.departments, ...data.departments };
              }
              items[index] = merged;
            } else if (index >= 0) {
              items[index] = { ...data, id, _id: id };
            } else {
              items.push({ ...data, id, _id: id });
            }
            writeData(collectionName, items);
            return { writeTime: new Date() };
          },
          delete: async () => {
            const items = readData(collectionName);
            const filtered = items.filter((i) => i.id !== id && i._id !== id);
            writeData(collectionName, filtered);
            return { writeTime: new Date() };
          },
        };
      },
      where: (field: string, op: string, val: any) => {
        const items = readData(collectionName);
        return createQuery(collectionName, items).where(field, op, val);
      },
      select: (..._fields: string[]) => {
        const items = readData(collectionName);
        return createQuery(collectionName, items);
      },
      count: () => ({
        get: async () => {
          const items = readData(collectionName);
          return {
            data: () => ({ count: items.length }),
          };
        },
      }),
      get: async () => {
        const items = readData(collectionName);
        return {
          docs: items.map((doc) => ({
            id: doc.id || doc._id,
            _id: doc.id || doc._id,
            data: () => ({ ...doc }),
            exists: true,
          })),
          size: items.length,
          empty: items.length === 0,
        };
      },
    };
  },
};
