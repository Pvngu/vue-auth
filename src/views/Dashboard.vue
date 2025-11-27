<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold">Dashboard</h1>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm text-muted-foreground">{{ authStore.user?.email }}</span>
            <Button variant="outline" @click="handleLogout">Logout</Button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Navigation Tabs -->
    <div class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav class="flex gap-8" aria-label="Tabs">
          <router-link
            v-if="authStore.hasPermission('users_view')"
            to="/dashboard/users"
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
            :class="$route.path === '/dashboard/users' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Users
          </router-link>
          <router-link
            v-if="authStore.hasPermission('categories_view')"
            to="/dashboard/categories"
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
            :class="$route.path === '/dashboard/categories' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Categories
          </router-link>
          <router-link
            v-if="authStore.hasPermission('items_view')"
            to="/dashboard/items"
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
            :class="$route.path === '/dashboard/items' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Items
          </router-link>
          <router-link
            v-if="authStore.hasPermission('roles_view')"
            to="/dashboard/roles"
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
            :class="$route.path === '/dashboard/roles' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Roles
          </router-link>
        </nav>
      </div>
    </div>

    <!-- Page Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function redirectToFirstAvailablePage() {
  // Only redirect if we're on the base dashboard route
  if (route.path === '/dashboard' || route.path === '/dashboard/') {
    if (authStore.hasPermission('users_view')) {
      router.replace('/dashboard/users')
    } else if (authStore.hasPermission('categories_view')) {
      router.replace('/dashboard/categories')
    } else if (authStore.hasPermission('items_view')) {
      router.replace('/dashboard/items')
    } else if (authStore.hasPermission('roles_view')) {
      router.replace('/dashboard/roles')
    }
  }
}

onMounted(async () => {
  await authStore.checkAuth()
  redirectToFirstAvailablePage()
})
</script>
