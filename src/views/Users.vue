<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">Users</h2>
      <Button v-if="canCreate" @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" />
        Add User
      </Button>
    </div>

    <Card>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Password</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="user in users" :key="user.id">
              <TableCell>{{ user.id }}</TableCell>
              <TableCell>{{ user.name }}</TableCell>
              <TableCell>{{ user.email }}</TableCell>
              <TableCell>{{ user.password }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button v-if="canUpdate" variant="ghost" size="sm" @click="openRolesDialog(user)" title="Manage Roles">
                    <UserCog class="h-4 w-4" />
                  </Button>
                  <Button v-if="canUpdate" variant="ghost" size="sm" @click="openEditDialog(user)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button v-if="canDelete && user.id !== 1" variant="ghost" size="sm" @click="deleteUser(user.id)">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="users.length === 0">
              <TableCell colspan="5" class="text-center text-muted-foreground">
                No users found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Create/Edit User Dialog -->
    <div
      v-if="showDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeDialog"
    >
      <Card class="w-full max-w-md">
        <CardHeader>
          <CardTitle>{{ isEditing ? 'Edit User' : 'Create User' }}</CardTitle>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="saveUser" class="space-y-4">
            <div class="space-y-2">
              <Label for="dialog-name">Name</Label>
              <Input
                id="dialog-name"
                v-model="formData.name"
                type="text"
                required
              />
            </div>
            <div class="space-y-2">
              <Label for="dialog-email">Email</Label>
              <Input
                id="dialog-email"
                v-model="formData.email"
                type="email"
                required
              />
            </div>
            <div class="space-y-2" v-if="!isEditing">
              <Label for="dialog-password">Password</Label>
              <Input
                id="dialog-password"
                v-model="formData.password"
                type="password"
                :required="!isEditing"
              />
            </div>
            <div v-if="dialogError" class="text-sm text-destructive">
              {{ dialogError }}
            </div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="closeDialog">
                Cancel
              </Button>
              <Button type="submit">
                {{ isEditing ? 'Update' : 'Create' }}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>

    <!-- Manage User Roles Dialog -->
    <div
      v-if="showRolesDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeRolesDialog"
    >
      <Card class="w-full max-w-md">
        <CardHeader>
          <CardTitle>Manage Roles for {{ selectedUser?.name }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div v-for="role in availableRoles" :key="role.id" class="flex items-center justify-between p-3 border rounded">
              <div>
                <div class="font-medium">{{ role.name }}</div>
                <div class="text-sm text-gray-500">{{ role.description }}</div>
              </div>
              <input
                type="checkbox"
                :checked="userRoles.some(ur => ur.id === role.id)"
                @change="toggleUserRole(role.id, $event)"
                class="h-4 w-4"
              />
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button type="button" variant="outline" @click="closeRolesDialog">Close</Button>
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
import { Plus, Pencil, Trash2, UserCog } from 'lucide-vue-next'

const authStore = useAuthStore()

const canView = computed(() => authStore.hasPermission('users_view'))
const canCreate = computed(() => authStore.hasPermission('users_create'))
const canUpdate = computed(() => authStore.hasPermission('users_update'))
const canDelete = computed(() => authStore.hasPermission('users_delete'))

interface User {
  id: number
  name: string
  email: string
  password: string
}

const users = ref<User[]>([])
const showDialog = ref(false)
const isEditing = ref(false)
const dialogError = ref('')
const formData = ref({
  id: 0,
  name: '',
  email: '',
  password: ''
})

// Role management state
const showRolesDialog = ref(false)
const selectedUser = ref<User | null>(null)
const availableRoles = ref<Array<{ id: number; name: string; description: string }>>([])
const userRoles = ref<Array<{ id: number; name: string; description: string }>>([])

async function fetchUsers() {
  try {
    const response = await axios.get('/api/users')
    users.value = response.data
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}

function openCreateDialog() {
  isEditing.value = false
  formData.value = { id: 0, name: '', email: '', password: '' }
  dialogError.value = ''
  showDialog.value = true
}

function openEditDialog(user: User) {
  isEditing.value = true
  formData.value = { ...user, password: '' }
  dialogError.value = ''
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  formData.value = { id: 0, name: '', email: '', password: '' }
  dialogError.value = ''
}

async function saveUser() {
  dialogError.value = ''
  try {
    if (isEditing.value) {
      await axios.put(`/api/users/${formData.value.id}`, {
        name: formData.value.name,
        email: formData.value.email
      })
    } else {
      await axios.post('/api/users', formData.value)
    }
    closeDialog()
    await fetchUsers()
  } catch (error: any) {
    dialogError.value = error.response?.data?.error || 'Operation failed'
  }
}

async function deleteUser(id: number) {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      await axios.delete(`/api/users/${id}`)
      await fetchUsers()
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }
}

async function fetchRoles() {
  try {
    const response = await axios.get('/api/roles')
    availableRoles.value = response.data
  } catch (error) {
    console.error('Failed to fetch roles:', error)
  }
}

async function fetchUserRoles(userId: number) {
  try {
    const response = await axios.get(`/api/users/${userId}/roles`)
    userRoles.value = response.data
  } catch (error) {
    console.error('Failed to fetch user roles:', error)
  }
}

async function openRolesDialog(user: User) {
  selectedUser.value = user
  await fetchUserRoles(user.id)
  showRolesDialog.value = true
}

function closeRolesDialog() {
  showRolesDialog.value = false
  selectedUser.value = null
  userRoles.value = []
}

async function toggleUserRole(roleId: number, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (!selectedUser.value) return
  
  try {
    if (checked) {
      await axios.post(`/api/users/${selectedUser.value.id}/roles`, { role_id: roleId })
    } else {
      await axios.delete(`/api/users/${selectedUser.value.id}/roles/${roleId}`)
    }
    await fetchUserRoles(selectedUser.value.id)
  } catch (error) {
    console.error('Failed to toggle role:', error)
  }
}

onMounted(() => {
  fetchUsers()
  fetchRoles()
})
</script>
