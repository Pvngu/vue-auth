<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">Roles & Permissions</h2>
      <Button v-if="canCreate" @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" />
        Add Role
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
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="role in roles" :key="role.id">
              <TableCell>{{ role.id }}</TableCell>
              <TableCell>{{ role.name }}</TableCell>
              <TableCell>{{ role.description }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button v-if="canUpdate" variant="ghost" size="sm" @click="openPermissionsDialog(role)">
                    <Shield class="h-4 w-4" />
                  </Button>
                  <Button v-if="canUpdate" variant="ghost" size="sm" @click="openEditDialog(role)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button v-if="canDelete" variant="ghost" size="sm" @click="deleteRole(role.id)">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="roles.length === 0">
              <TableCell colspan="4" class="text-center text-muted-foreground">
                No roles found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Create/Edit Role Dialog -->
    <div
      v-if="showDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeDialog"
    >
      <Card class="w-full max-w-md">
        <CardHeader>
          <CardTitle>{{ isEditing ? 'Edit Role' : 'Create Role' }}</CardTitle>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="saveRole" class="space-y-4">
            <div class="space-y-2">
              <Label for="role-name">Name</Label>
              <Input id="role-name" v-model="formData.name" type="text" required />
            </div>
            <div class="space-y-2">
              <Label for="role-desc">Description</Label>
              <textarea id="role-desc" v-model="formData.description" class="w-full rounded-md border p-2" rows="3"></textarea>
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

    <!-- Manage Permissions Dialog -->
    <div
      v-if="showPermissionsDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closePermissionsDialog"
    >
      <Card class="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Manage Permissions for {{ selectedRole?.name }}</CardTitle>
        </CardHeader>
        <CardContent class="max-h-[70vh] overflow-y-auto">
          <div class="space-y-2">
            <div v-for="perm in allPermissions" :key="perm.id" class="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div>
                <div class="font-medium">{{ perm.name }}</div>
                <div class="text-sm text-gray-500">{{ perm.description }}</div>
              </div>
              <input
                type="checkbox"
                :checked="rolePermissions.some(rp => rp.id === perm.id)"
                @change="togglePermission(perm.id, $event)"
                class="h-4 w-4"
              />
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button type="button" variant="outline" @click="closePermissionsDialog">Close</Button>
          </div>
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
import { Plus, Pencil, Trash2, Shield } from 'lucide-vue-next'

const authStore = useAuthStore()

const canView = computed(() => authStore.hasPermission('roles_view'))
const canCreate = computed(() => authStore.hasPermission('roles_create'))
const canUpdate = computed(() => authStore.hasPermission('roles_update'))
const canDelete = computed(() => authStore.hasPermission('roles_delete'))

const roles = ref<Array<{ id: number; name: string; description: string }>>([])
const allPermissions = ref<Array<{ id: number; name: string; description: string }>>([])
const rolePermissions = ref<Array<{ id: number; name: string; description: string }>>([])
const showDialog = ref(false)
const isEditing = ref(false)
const dialogError = ref('')
const formData = ref({ id: 0, name: '', description: '' })
const showPermissionsDialog = ref(false)
const selectedRole = ref<{ id: number; name: string } | null>(null)

async function fetchRoles() {
  try {
    const res = await axios.get('/api/roles')
    roles.value = res.data
  } catch (err) {
    console.error('Failed to fetch roles:', err)
  }
}

async function fetchPermissions() {
  try {
    const res = await axios.get('/api/permissions')
    allPermissions.value = res.data
  } catch (err) {
    console.error('Failed to fetch permissions:', err)
  }
}

async function fetchRolePermissions(roleId: number) {
  try {
    const res = await axios.get(`/api/roles/${roleId}/permissions`)
    rolePermissions.value = res.data
  } catch (err) {
    console.error('Failed to fetch role permissions:', err)
  }
}

function openCreateDialog() {
  isEditing.value = false
  formData.value = { id: 0, name: '', description: '' }
  dialogError.value = ''
  showDialog.value = true
}

function openEditDialog(role: { id: number; name: string; description: string }) {
  isEditing.value = true
  formData.value = { ...role }
  dialogError.value = ''
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
}

async function saveRole() {
  dialogError.value = ''
  try {
    if (isEditing.value) {
      await axios.put(`/api/roles/${formData.value.id}`, formData.value)
    } else {
      await axios.post('/api/roles', formData.value)
    }
    closeDialog()
    await fetchRoles()
  } catch (err: any) {
    dialogError.value = err.response?.data?.error || 'Operation failed'
  }
}

async function deleteRole(id: number) {
  if (!confirm('Delete this role?')) return
  try {
    await axios.delete(`/api/roles/${id}`)
    await fetchRoles()
  } catch (err) {
    console.error('Failed to delete role:', err)
  }
}

async function openPermissionsDialog(role: { id: number; name: string; description: string }) {
  selectedRole.value = role
  await fetchRolePermissions(role.id)
  showPermissionsDialog.value = true
}

function closePermissionsDialog() {
  showPermissionsDialog.value = false
  selectedRole.value = null
}

async function togglePermission(permissionId: number, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (!selectedRole.value) return
  
  try {
    if (checked) {
      await axios.post(`/api/roles/${selectedRole.value.id}/permissions`, { permission_id: permissionId })
    } else {
      await axios.delete(`/api/roles/${selectedRole.value.id}/permissions/${permissionId}`)
    }
    await fetchRolePermissions(selectedRole.value.id)
  } catch (err) {
    console.error('Failed to toggle permission:', err)
  }
}

onMounted(() => {
  fetchRoles()
  fetchPermissions()
})
</script>
