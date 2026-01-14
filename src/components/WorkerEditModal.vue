<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Worker } from '@/types'

const props = defineProps<{
  show: boolean
  worker: Worker | null // null = add new, Worker = edit existing
}>()

const emit = defineEmits<{
  close: []
  save: [name: string]
}>()

const name = ref('')
const saving = ref(false)

// Reset form when modal opens/closes or worker changes
watch(() => [props.show, props.worker], () => {
  if (props.show) {
    name.value = props.worker?.name || ''
  }
}, { immediate: true })

const isEdit = computed(() => props.worker !== null)

const canSave = computed(() => {
  const trimmed = name.value.trim()
  if (!trimmed) return false
  // For edit mode, check if name actually changed
  if (isEdit.value && trimmed === props.worker?.name) return false
  return true
})

async function handleSave() {
  if (!canSave.value || saving.value) return
  saving.value = true
  emit('save', name.value.trim())
  saving.value = false
}

function handleClose() {
  emit('close')
}

// Close on escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal-overlay"
      @click.self="handleClose"
      @keydown="handleKeydown"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEdit ? 'Medewerker bewerken' : 'Nieuwe medewerker' }}</h3>
          <button class="modal-close" @click="handleClose" type="button">
            &times;
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="worker-name">Naam</label>
            <input
              id="worker-name"
              type="text"
              v-model="name"
              placeholder="Naam medewerker"
              autocomplete="off"
              @keyup.enter="handleSave"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="handleClose"
            type="button"
          >
            Annuleren
          </button>
          <button
            class="btn btn-success"
            @click="handleSave"
            :disabled="!canSave || saving"
            type="button"
          >
            {{ saving ? 'Opslaan...' : 'Opslaan' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  z-index: 1000;
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
}

.modal-close {
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: var(--space-md);
}

.modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.modal-footer .btn {
  flex: 1;
  height: 48px;
}
</style>
