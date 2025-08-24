<template>
  <select class="b3-select fn__flex-center fn__size200" v-model="selectedNotebookId">
    <template v-for="{ id, name } in notebooks" :key="id">
      <option :value="id">{{ name }}</option>
    </template>
  </select>
</template>
<script lang="ts" setup>
import { Constants } from 'siyuan';
import { lsNotebooks, request } from '@/api/api';

const notebooks = ref<Notebook[]>([]);
const selectedNotebookId = ref<NotebookId | undefined>(undefined);

async function loadNotebooks() {
  const { notebooks: books } = await lsNotebooks();
  notebooks.value = books.filter((book: Notebook) => !book.closed);
  const storage = await request('/api/storage/getLocalStorage');
  if (notebooks.value.map(book => book.id).includes(storage['local-dailynoteid'])) {
    selectedNotebookId.value = storage['local-dailynoteid'];
  } else {
    selectedNotebookId.value = undefined;
  }
}
loadNotebooks();

watch(selectedNotebookId, async bookId => {
  if (!bookId) {
    return;
  }
  const storage = await request('/api/storage/getLocalStorage');
  if (bookId !== storage['local-dailynoteid']) {
    await request('/api/storage/setLocalStorageVal', {
      app: Constants.SIYUAN_APPID,
      key: 'local-dailynoteid',
      val: bookId,
    });
  }
});
</script>


