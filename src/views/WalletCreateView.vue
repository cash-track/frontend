<script setup lang="ts">
import WalletCreate from '@/components/wallets/WalletCreate.vue'
import WalletsActiveShortList from '@/components/wallets/WalletsActiveShortList.vue'
</script>

<template>
    <div>
        <WalletsActiveShortList />
        <div class="max-w-lg mx-auto">
            <WalletCreate />
        </div>
    </div>
</template>
