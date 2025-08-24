import dayjs from 'dayjs';
import * as api from '@/api/api';
import { setCustomDNAttr } from '@/api/daily-note';

export class CusNotebook implements Notebook, NotebookConf {
  constructor(
    public id: NotebookId,
    public name: string,
    public dailyNoteSavePath: string,
    public dailyNoteTemplatePath: string,
  ) {}

  static async build({ id, name }: Notebook) {
    const { conf } = await api.getNotebookConf(id);
    let { dailyNoteSavePath, dailyNoteTemplatePath } = conf;
    dailyNoteSavePath = dailyNoteSavePath.replace(/\{\{(.*?)\}\}/g, match =>
      match.replace(/\bnow\b(?=(?:(?:[^"]*"){2})*[^"]*$)/g, `(toDate "2006-01-02" "[[dateSlot]]")`)
    );
    if (dailyNoteTemplatePath) {
      const system = await api.request('/api/system/getConf');
      dailyNoteTemplatePath = system.conf.system.dataDir + '/templates' + dailyNoteTemplatePath;
    }
    return new CusNotebook(id, name, dailyNoteSavePath, dailyNoteTemplatePath);
  }

  getSavePath(date: Date) {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const path = this.dailyNoteSavePath.replaceAll('[[dateSlot]]', dateStr);
    return api.renderSprig(path);
  }

  async searchDailyNote(condition: string) {
    return api.sql(`SELECT * FROM blocks WHERE type='d' AND box = '${this.id}' AND ${condition}`);
  }

  async getExistDailyNote(date: Date): Promise<DailyNote[] | undefined> {
    const month = dayjs(date).format('YYYYMM');
    const condition = `id IN (SELECT block_id FROM attributes AS a WHERE a.name like 'custom-dailynote-${month}__') `;
    const dailyNotes = await this.searchDailyNote(condition);
    if (!dailyNotes.length) {
      return;
    }
    const result = [];
    for (const { id, ial } of dailyNotes) {
      const match = ial?.match(/custom-dailynote-(\d{8})/);      
      if (match) {
        const dateStr = dayjs(match[1]).format('YYYY-MM-DD');
        result.push({ id, dateStr });
      }
    }
    return result;
  }

  async createDailyNote(date: Date): Promise<DailyNote> {
    const hPath = await this.getSavePath(date);
    const [dailyNote] = await this.searchDailyNote(`hpath = '${hPath}'`);
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    // If a daily note for the current date already exists but has no document attribute, set it and return the note
    if (dailyNote) {
      const { id } = dailyNote;
      setCustomDNAttr(id, date); // Add custom attribute to the newly created daily note
      return { id, dateStr };
    }
    // If there is no daily note for the current date, create a new daily note
    const docID = await api.createDocWithMd(this.id, hPath, '');
    // Render the daily note using the template
    if (this.dailyNoteTemplatePath.length) {
      const res = await api.render(docID, this.dailyNoteTemplatePath);
      await api.prependBlock('dom', res.content, docID);
    }
    setCustomDNAttr(docID, date); // Add custom attribute to the newly created daily note
    return { id: docID, dateStr };
  }
}
