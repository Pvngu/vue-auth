<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">Categories</h2>
      <Button v-if="canCreate" @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" />
        Add Category
      </Button>
    </div>

    <Card>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="cat in categories" :key="cat.id">
              <TableCell>{{ cat.id }}</TableCell>
              <TableCell>{{ cat.name }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button v-if="canUpdate" variant="ghost" size="sm" @click="openEditDialog(cat)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button v-if="canDelete" variant="ghost" size="sm" @click="deleteCategory(cat.id)">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="categories.length === 0">
              <TableCell colspan="3" class="text-center text-muted-foreground">
                No categories found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Create/Edit Category Dialog -->
    <div
      v-if="showDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeDialog"
    >
      <Card class="w-full max-w-md">
        <CardHeader>
          <CardTitle>{{ isEditing ? 'Edit Category' : 'Create Category' }}</CardTitle>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="saveCategory" class="space-y-4">
            <div class="space-y-2">
              <Label for="cat-name">Name</Label>
              <Input id="cat-name" v-model="formData.name" type="text" required />
            </div>
            <div v-if="dialogError" class="text-sm text-destructive">{{ dialogError }}</div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="closeDialog">Cancel</Button>
              <Button type="submit">{{ isEditing ? 'Update' : 'Create' }}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'

const authStore = useAuthStore()

const canView = computed(() => authStore.hasPermission('categories_view'))
const canCreate = computed(() => authStore.hasPermission('categories_create'))
const canUpdate = computed(() => authStore.hasPermission('categories_update'))
const canDelete = computed(() => authStore.hasPermission('categories_delete'))

const categories = ref<Array<{ id: number; name: string }>>([])
const showDialog = ref(false)
const isEditing = ref(false)
const dialogError = ref('')
const formData = ref({ id: 0, name: '' })

async function fetchCategories() {
  try {
    const res = await axios.get('/api/categories')
    categories.value = res.data
  } catch (err) {
    console.error('Failed to fetch categories:', err)
  }
}

function openCreateDialog() {
  isEditing.value = false
  formData.value = { id: 0, name: '' }
  dialogError.value = ''
  showDialog.value = true
}

function openEditDialog(cat: { id: number; name: string }) {
  isEditing.value = true
  formData.value = { ...cat }
  dialogError.value = ''
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
}

async function saveCategory() {
  dialogError.value = ''
  try {
    if (isEditing.value) {
      await axios.put(`/api/categories/${formData.value.id}`, { name: formData.value.name })
    } else {
      await axios.post('/api/categories', { name: formData.value.name })
    }
    closeDialog()
    await fetchCategories()
  } catch (err: any) {
    dialogError.value = err.response?.data?.error || 'Operation failed'
  }
}

async function deleteCategory(id: number) {
  if (!confirm('Delete this category? Items will be unassigned.')) return
  try {
    await axios.delete(`/api/categories/${id}`)
    await fetchCategories()
  } catch (err) {
    console.error('Failed to delete category:', err)
  }
}

onMounted(() => {
  fetchCategories()
})
</script>
