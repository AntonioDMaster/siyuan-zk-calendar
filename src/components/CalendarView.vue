<template>
  <a-date-picker
    v-model="thisDay"
    @picker-value-change="changeMonth"
    hide-trigger
    style="width: 268px; margin: auto; box-shadow: none"
  >
    <template #cell="{ date }">
      <div class="arco-picker-date">
        <div class="arco-picker-date-value" @click="openDailyNote(date)" :class="{ exist: getCell(date) }">
          {{ date.getDate() }}
        </div>
      </div>
    </template>
    <template #extra>
      <a-row style="text-align: center">
        <a-button size="mini" @click="clickToday"> {{ locale.datePicker.today }} </a-button>
      </a-row>
    </template>
  </a-date-picker>
</template>
<script lang="ts" setup>
import dayjs from 'dayjs';
import * as api from '@/api/api';
import { openDoc } from '@/api/daily-note';
import { useLocale, formatMsg } from '@/hooks/useLocale';
import { eventBus, confirmBeforeCreate, i18n } from '@/hooks/useSiYuan';
import { CusNotebook } from '@/utils/notebook';
import { refreshSql } from '@/api/utils';
import { Dialog } from 'siyuan';

const { locale } = useLocale();

const props = defineProps<{ notebook: CusNotebook | undefined }>();
const { notebook } = toRefs(props);

// Dates with existing daily notes
const existDailyNotesMap = ref(new Map());

async function getExistDate(date: Date) {
  if (!notebook.value) {
    return;
  }
  const existDailyNotes = await notebook.value.getExistDailyNote(date);
  if (!existDailyNotes) {
    return;
  }
  for (const { id, dateStr } of existDailyNotes) {
    existDailyNotesMap.value.set(dateStr, id);
  }
}

watch(notebook, notebook => {
  existDailyNotesMap.value.clear();
  if (notebook) {
    getExistDate(new Date());
  }
});

const thisDay = ref();

function clickToday() {
  const today = new Date();
  openDailyNote(today);
  thisDay.value = dayjs(today).format('YYYY-MM-DD');
}

async function openDailyNote(date: Date) {
  if (!notebook.value) {
    await api.pushErrMsg(formatMsg('notNoteBook'));
    return;
  }
  const dateStr = dayjs(date).format('YYYY-MM-DD');
  if (existDailyNotesMap.value.has(dateStr)) {
    openDoc(existDailyNotesMap.value.get(dateStr));
    return;
  }
  if (confirmBeforeCreate.value) {
    const ok = await new Promise<boolean>(resolve => {
      const title = i18n.value.settings?.confirmBeforeCreate?.title || 'Confirm before creating new note';
      const contentText = i18n.value.settings?.confirmBeforeCreate?.content || 'No daily note exists for this date. Create it now?';
      const okText = i18n.value.settings?.confirmBeforeCreate?.ok || 'Create';
      const cancelText = i18n.value.settings?.confirmBeforeCreate?.cancel || 'Cancel';
      const html = `
        <div class="b3-dialog__content">${contentText}</div>
        <div class="b3-dialog__action" style="gap:8px;display:flex;justify-content:flex-end;">
          <button class="b3-button" data-action="cancel">${cancelText}</button>
          <button class="b3-button b3-button--outline" data-action="ok">${okText}</button>
        </div>
      `;
      const d = new Dialog({
        title,
        content: html,
        width: '520px',
        height: 'auto',
        destroyCallback: () => resolve(false),
      });
      const root = d.element as HTMLElement;
      const cancelBtn = root.querySelector('[data-action="cancel"]') as HTMLButtonElement | null;
      const okBtn = root.querySelector('[data-action="ok"]') as HTMLButtonElement | null;
      cancelBtn && (cancelBtn.onclick = () => { d.destroy(); resolve(false); });
      okBtn && (okBtn.onclick = () => { d.destroy(); resolve(true); });
    });
    if (!ok) return;
  }
  const dailyNote = await notebook.value.createDailyNote(date);
  const { id } = dailyNote;
  openDoc(id); // Open the newly created daily note
  existDailyNotesMap.value.set(dateStr, id);
}

const thisPanelDate = ref(new Date());
function changeMonth(dateStr: string) {
  thisPanelDate.value = new Date(dateStr);
  getExistDate(thisPanelDate.value);
}

eventBus.value?.on('ws-main', async ({ detail }) => {
  if (!notebook.value) {
    return;
  }
  const { cmd } = detail;
  if (['removeDoc', 'createdailynote'].includes(cmd)) {
    await refreshSql();
    await getExistDate(thisPanelDate.value);
  }
});

// Set cell class
function getCell(date: Date) {
  return existDailyNotesMap.value.has(dayjs(date).format('YYYY-MM-DD'));
}
</script>
