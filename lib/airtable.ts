import Airtable, { FieldSet, Records, Record } from "airtable";

// Inicializácia Airtable klienta s API kľúčom a ID databázy z environment premenných
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID!);

// Exportujeme inštanciu 'base', aby sme mohli volať .select(), .create() atď.
// Názov 'airtable' je kratší a pohodlnejší.
export const airtable = (tableName: string) => base(tableName);

// Pomocná funkcia na "zmenšenie" komplexného objektu z Airtable 
// na jednoduchší formát { id, fields }.
export const getMinifiedRecords = (records: readonly Record<FieldSet>[]) => {
  return records.map((record) => ({
    id: record.id,
    fields: record.fields,
  }));
};