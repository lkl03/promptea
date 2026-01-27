import fs from "node:fs";
import path from "node:path";
import { DatasetCase } from "./schema";

export function loadDatasetCases(): DatasetCase[] {
  const base = path.join(process.cwd(), "lib/engine/dataset/cases");
  const out: DatasetCase[] = [];

  for (const lang of ["es", "en"] as const) {
    const dir = path.join(base, lang);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".jsonl")) continue;
      const full = path.join(dir, file);
      const lines = fs.readFileSync(full, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        out.push(JSON.parse(line));
      }
    }
  }

  return out;
}
