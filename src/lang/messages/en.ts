export default {
    name: 'English',
    flag: '🇺🇸',
    help: 'Help',
    about: 'About',
    myProfile: 'My Profile',
    settings: 'Settings',
    signOut: 'Sign Out',
    madeBy: 'Made with ❤️ &nbsp;in 🇺🇦',
    error: 'Error',
    loadingData: 'Loading Data..',
    cookiePolicy: 'Cookie Policy',
    privacyPolicy: 'Privacy Policy',

    currency: {
        USD: 'United States dollar',
        UAH: 'Ukrainian hryvnia',
        EUR: 'European euro',
    },

    personalSettings: {
        header: 'Personal Settings',
        profile: 'Profile',
        security: 'Security',
    },

    emailFormInput: {
        label: 'Email',
        labelDescription: 'To use all service features please confirm your email.',
        resend: 'Resend',
        confirmationMessage: 'confirmation message.',
        confirmationMessageSent: 'Confirmation email has been sent. You will be able to retry in {0} seconds.',
        confirmed: 'Your email has been confirmed.',
    },

    profilePhoto: {
        photo: 'Photo',
        currentPhoto: 'Current Photo',
        currentPhotoDescription: 'Your current profile photo',
        labelDescription: 'Your personal profile photo. The best choice is a square photo (for ex: 500pxx500px). Do not use too big picture as it is useless.',
        label: 'File',
        labelPlaceholder: 'Choose a file or drop it here...',
        labelDropPlaceholder: 'Drop file here...',
        selectedFile: 'Selected file:',
        save: 'Save',
    },

    securitySettings: {
        changePassword: 'Change Password',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        newPasswordDescription: 'Password must contain at least 6 symbols',
        newPasswordConfirmation: 'Confirm New Password',
        newPasswordConfirmationDescription: 'Repeat new password here just for sure',
        updatePassword: 'Update Password',
    },

    profileSettings: {
        profileSettings: 'Profile Settings',
        name: 'Name',
        nameDescription: 'Your name will be visible in different places',
        lastName: 'Last Name',
        lastNameDescription: '',
        nickName: 'Nick Name',
        nickNameDescription: 'Your unique identification. Will be used in some URLs, mentions, etc.',
        defaultCurrency: 'Default Currency',
        defaultCurrencyDescription: 'Your local currency that you\'re using most of time. Will be used for new wallets as default currency.',
        language: 'Language',
        languageDescription: 'Change interface language from the supported list',
        save: 'Save',
        success: 'Your profile has been updated',
        social: 'Social Networks Login',
    },

    profile: {
        profile: 'Profile',
        latestWallets: 'Latest Wallets',
        commonTags: 'Common Tags',

        chargesFlowLoadingError: 'Unable to load charges statistics. Please try again later.',
        chargesFlowNotice: 'For now this statistics took into account only wallets that matched with your default currency.',

        income: 'Income',
        expense: 'Expense',
        allTime: 'All time',
        year: 'Year',
        quarter: 'Quarter',
        month: 'Month',

        emailNotConfirmed: 'Account is not confirmed',
        emailNotConfirmedMainMessage: 'Please check your mailbox (maybe Spam folder as well) for a confirmation message to activate your account. Your access is limited until you confirm your account.',
        emailNotConfirmedResendMessage: 'You can resend confirmation message from profile settings.',

        counters: 'Counters',
        totalWalletsAmount: 'Total wallets amount',
        archivedWalletsAmount: 'Archived wallets amount',
        totalChargesAmount: 'Total charges amount',
        incomeChargesAmount: 'Amount of income charges',
        expenseChargesAmount: 'Amount of expense charges',
    },

    wallets: {
        wallets: 'Wallets',
        newWallet: 'New Wallet',
        active: 'active',
        activeTitle: 'Active',
        archived: 'archived',
        archivedTitle: 'Archived',
        moreMembers: 'and more members..',
        listLoadingError: 'Unable to load your wallets. Please try again later.',
        noWallets: 'No Wallets',
        noWalletsMessage: 'You don\'t have any wallets yet. Good time to create one.',
        noWalletsCreate: 'Create',

        loadingError: 'Unable to load your wallet. Please try again later.',
        edit: 'Edit',
        moreActions: 'More actions',
        share: 'Share',
        activate: 'Activate',
        disable: 'Disable',
        toArchive: 'To Archive',
        unArchive: 'Un Archive',
        delete: 'Delete',
        available: 'Available',
        income: 'Income',
        expense: 'Expense',
        graph: 'Graph',
        filters: 'Filters',

        groupBy: 'Group By',
        groupByDay: 'Day',
        groupByMonth: 'Month',
        groupByYear: 'Year',
        chartLoadingError: 'Unable to load chart data. Please try again later.',

        createTitle: 'Create Wallet',
        editTitle: 'Edit Wallet',
        formName: 'Name',
        formCurrency: 'Currency',
        formCurrencyDescription: 'Default currency for this wallet.',
        create: 'Create',
        update: 'Update',
        cancel: 'Cancel',

        shareTitle: 'Members of',
        shareMembersLoadingError: 'Unable to load users of wallet. Please try again later.',
        shareCommonUsers: 'Users you may know as you have common wallets',
        shareSelect: 'Select',
        shareEmailHint: 'Type email of user you want to invite',
        shareSearch: 'Search',
        shareInvite: 'Invite',
        shareSearchError: 'User not found',
        shareCancelInvite: 'Stop sharing wallet {0} for this user',
    },

    charges: {
        edit: 'Edit',
        delete: 'Delete',
        deletingConfirm: 'Are you sure?',

        new: 'New Charge',
        amount: 'Amount',
        title: 'Title',
        description: 'Description',
        create: 'Create',
        update: 'Update',
        cancel: 'Cancel',
        changeDescription: 'Change description',
        changeDate: 'Change date',

        loading: 'Loading Charges..',
        loadingError: 'Unable to load charges. Please try again later.',
        loadingMore: 'Loading more..',
        loadingMoreError: 'Unable to load more charges. Please try again later.',

        filterFrom: 'From',
        filterInputFrom: 'Date from',
        filterTo: 'To',
        filterInputTo: 'Date to',
    },

    tags: {
        tags: 'Tags',
        addNew: 'Add New',
        inputLabel: 'Tag name',
        inputDescription: 'Enter tag name. Try add emoji at the beginning.',
        create: 'Create',
        update: 'Save',
        deletingConfirm: 'Deleting tag {0}. Are you sure?',
        autocompleteHint: 'Find or create tags by start typing..',

        stats: 'Analyse tags usage',
        statsLoadingError: 'Unable to load tag. Please try again later',
    },
};
