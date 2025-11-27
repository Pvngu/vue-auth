<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">Items</h2>
      <Button v-if="canCreate" @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" />
        Add Item
      </Button>
    </div>

    <Card>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in items" :key="item.id">
              <TableCell>{{ item.id }}</TableCell>
              <TableCell>{{ item.name }}</TableCell>
              <TableCell>{{ item.description }}</TableCell>
              <TableCell>{{ item.category_name || '-' }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button v-if="canUpdate" variant="ghost" size="sm" @click="openEditDialog(item)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button v-if="canDelete" variant="ghost" size="sm" @click="deleteItem(item.id)">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="items.length === 0">
              <TableCell colspan="5" class="text-center text-muted-foreground">
                No items found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Create/Edit Item Dialog -->
    <div
      v-if="showDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeDialog"
    >
      <Card class="w-full max-w-md">
        <CardHeader>
          <CardTitle>{{ isEditing ? 'Edit Item' : 'Create Item' }}</CardTitle>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="saveItem" class="space-y-4">
            <div class="space-y-2">
              <Label for="item-name">Name</Label>
              <Input id="item-name" v-model="formData.name" type="text" required />
            </div>
            <div class="space-y-2">
              <Label for="item-desc">Description</Label>
              <textarea id="item-desc" v-model="formData.description" class="w-full rounded-md border p-2" rows="3"></textarea>
            </div>
            <div class="space-y-2">
              <Label for="item-cat">Category</Label>
              <select id="item-cat" v-model="formData.category_id" class="w-full rounded-md border p-2">
                <option :value="null">-- None --</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
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

const canView = computed(() => authStore.hasPermission('items_view'))
const canCreate = computed(() => authStore.hasPermission('items_create'))
const canUpdate = computed(() => authStore.hasPermission('items_update'))
const canDelete = computed(() => authStore.hasPermission('items_delete'))

const categories = ref<Array<{ id: number; name: string }>>([])
const items = ref<Array<any>>([])
const showDialog = ref(false)
const isEditing = ref(false)
const dialogError = ref('')
const formData = ref({ id: 0, name: '', description: '', category_id: null as number | null })

async function fetchCategories() {
  try {
    const res = await axios.get('/api/categories')
    categories.value = res.data
  } catch (err) {
    console.error('Failed to fetch categories:', err)
  }
}

async function fetchItems() {
  try {
    const res = await axios.get('/api/items')
    items.value = res.data
  } catch (err) {
    console.error('Failed to fetch items:', err)
  }
}

function openCreateDialog() {
  isEditing.value = false
  formData.value = { id: 0, name: '', description: '', category_id: null }
  dialogError.value = ''
  showDialog.value = true
}

function openEditDialog(item: any) {
  isEditing.value = true
  formData.value = { id: item.id, name: item.name, description: item.description || '', category_id: item.category_id }
  dialogError.value = ''
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
}

async function saveItem() {
  dialogError.value = ''
  try {
    if (isEditing.value) {
      await axios.put(`/api/items/${formData.value.id}`, formData.value)
    } else {
      await axios.post('/api/items', formData.value)
    }
    closeDialog()
    await fetchItems()
  } catch (err: any) {
    dialogError.value = err.response?.data?.error || 'Operation failed'
  }
}

async function deleteItem(id: number) {
  if (!confirm('Delete this item?')) return
  try {
    await axios.delete(`/api/items/${id}`)
    await fetchItems()
  } catch (err) {
    console.error('Failed to delete item:', err)
  }
}

onMounted(() => {
  fetchCategories()
  fetchItems()
})
</script>
