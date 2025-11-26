<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold">User Dashboard</h1>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm text-muted-foreground">{{ authStore.user?.email }}</span>
            <Button variant="outline" @click="handleLogout">Logout</Button>
          </div>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">Users</h2>
        <Button @click="openCreateDialog">
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
                    <Button variant="ghost" size="sm" @click="openEditDialog(user)">
                      <Pencil class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" @click="deleteUser(user.id)">
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="users.length === 0">
                <TableCell colspan="4" class="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'

interface User {
  id: number
  name: string
  email: string
}

const router = useRouter()
const authStore = useAuthStore()

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

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  authStore.checkAuth()
  fetchUsers()
})
</script>
