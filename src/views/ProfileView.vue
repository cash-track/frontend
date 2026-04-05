<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import ProfileAvatarBadge from '@/components/profile/ProfileAvatarBadge.vue'
import ProfileTitle from '@/components/profile/ProfileTitle.vue'
import EmailIsNotConfirmedAlert from '@/components/profile/EmailIsNotConfirmedAlert.vue'
import CountersStatistics from '@/components/profile/CountersStatistics.vue'
import ChargesFlowStatistics from '@/components/profile/ChargesFlowStatistics.vue'
import LatestWallets from '@/components/profile/LatestWallets.vue'
import CommonTags from '@/components/profile/CommonTags.vue'

const { profile } = storeToRefs(useProfileStore())
</script>

<template>
    <UContainer class="py-6 space-y-8">
        <!-- Profile header: avatar + title -->
        <div v-if="profile" class="flex items-center gap-4">
            <ProfileAvatarBadge :user="profile" />
            <ProfileTitle :user="profile" />
        </div>
        <div v-else class="flex items-center gap-4">
            <USkeleton class="size-24 rounded-full" />
            <div class="space-y-2">
                <USkeleton class="h-6 w-40 rounded" />
                <USkeleton class="h-4 w-28 rounded" />
                <USkeleton class="h-4 w-36 rounded" />
            </div>
        </div>

        <!-- Two-column layout: counters + stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Left: counters + common tags -->
            <div class="space-y-6">
                <CountersStatistics />
                <CommonTags />
            </div>

            <!-- Right: email alert + charges flow stats -->
            <div class="md:col-span-2 space-y-4">
                <EmailIsNotConfirmedAlert />
                <ChargesFlowStatistics />
            </div>
        </div>

        <!-- Latest wallets (full width) -->
        <div class="border-t border-default pt-6">
            <LatestWallets />
        </div>
    </UContainer>
</template>
