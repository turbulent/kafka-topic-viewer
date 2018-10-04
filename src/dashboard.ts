export interface LineGraphEntry {
  time: number;
  messages: number;
}

export interface TimeStats {
  time: number;
  accumulator: number;
  max: number;
  cur: number;
  entries: LineGraphEntry[];
  perc: number;
}
export interface DataTable {
  headers: string[];
  data: Array<[string|number, string|number]>;
}

export interface Message {
  topic: string;
  offset: number;
  value: any;
  unpacked?: any;
}

export interface MessageDetails {
  lines: string[];
  message: Message;
}

export const COLOR_HOVER: string = '#076563';
