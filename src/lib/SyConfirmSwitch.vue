<template>
  <div class="sac-confirm-switch">
    <input type="checkbox" class="b3-switch" v-model="enabled" />
  </div>
</template>
<script lang="ts" setup>
import { confirmBeforeCreate } from '@/hooks/useSiYuan';

const enabled = computed({
  get: () => confirmBeforeCreate.value,
  set: v => (confirmBeforeCreate.value = v),
});
</script>


