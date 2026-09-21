<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Modal from './Modal.vue'
import Button from './Button.vue'

const { t } = useI18n()

withDefaults(
  defineProps<{ title: string; message: string; variant?: 'danger' | 'warning' }>(),
  { variant: 'danger' },
)

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ confirm: [] }>()

function confirm() {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <Modal v-model:open="open" :title="title" size="sm">
    <p class="text-sm text-slate-600 dark:text-slate-300 mb-5">{{ message }}</p>
    <div class="flex gap-3 justify-end">
      <Button variant="outline" @click="open = false">{{ t('common.cancel') }}</Button>
      <Button :variant="variant === 'danger' ? 'danger' : 'secondary'" @click="confirm">{{ t('common.confirm') }}</Button>
    </div>
  </Modal>
</template>
