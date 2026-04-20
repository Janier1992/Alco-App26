import { createClient } from "@insforge/sdk";

const INSFORGE_URL = "https://5czjn84m.us-east.insforge.app";
const INSFORGE_KEY = "ik_1993a732585fd3d931ef489e85fa4591";

const insforge = createClient({ baseUrl: INSFORGE_URL, anonKey: INSFORGE_KEY });

async function check() {
    console.log("Checking kb_fragments table...");
    const { data, count, error } = await insforge.database
        .from("kb_fragments")
        .select("*", { count: 'exact', head: true });

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log(`Table has ${count} records.`);
    }
}

check();
