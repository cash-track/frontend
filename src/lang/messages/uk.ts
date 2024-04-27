export default {
    name: 'Українська',
    flag: '🇺🇦',
    help: 'Допомога',
    about: 'Про нас',
    myProfile: 'Мій профіль',
    settings: 'Налаштування',
    signOut: 'Вийти',
    madeBy: 'Зроблено з ❤️ &nbsp;в&nbsp; 🇺🇦',
    error: 'Упс..',
    loadingData: 'Завантаження даних..',
    cookiePolicy: 'Про Cookie',
    privacyPolicy: 'Про Конфіденційність',
    unknownError: 'Невідома помилка, будь ласка, спробуйте пізніше.',

    currency: {
        USD: 'Долар США',
        UAH: 'Українська гривня',
        EUR: 'Євро',
    },

    personalSettings: {
        header: 'Персональні Налаштування',
        profile: 'Профіль',
        security: 'Безпека',
    },

    emailFormInput: {
        label: 'Email',
        labelDescription: 'Щоб використовувати всі переваги Cash Track підтвердіть ваш Email.',
        resend: 'Відправити повторно',
        confirmationMessage: 'повідомлення для підтвердження Email.',
        confirmationMessageSent: 'Повідомлення для підтвердження Email надіслано. Можете відправити повторно через {0} секунд.',
        confirmed: 'Ваш Email успішно підтверджено.',
    },

    profilePhoto: {
        photo: 'Фото',
        currentPhoto: 'Поточне фото',
        currentPhotoDescription: 'Ваше поточне фото профілю',
        labelDescription: 'Фото вашого персонального профілю. Рекомендуємо обрати квадратне фото (наприклад 500px на 500px). Не використовуйте завеликі фото, зазвичай вони будуть відображатись невеликого розміру.',
        label: 'Файл',
        labelPlaceholder: 'Оберіть файл або перетягніть сюди...',
        labelDropPlaceholder: 'Перетягніть файл сюди...',
        selectedFile: 'Обрано файл:',
        save: 'Зберегти',
    },

    securitySettings: {
        changePassword: 'Змінити Пароль',
        currentPassword: 'Поточний Пароль',
        newPassword: 'Новий Пароль',
        newPasswordDescription: 'Пароль має бути принаймні довжиною в 6 символів',
        newPasswordConfirmation: 'Новий Пароль ще раз',
        newPasswordConfirmationDescription: 'Повторіть новий пароль, просто щоб переконатись',
        updatePassword: 'Змінити Пароль',
    },

    passkeySettings: {
        passkeys: 'Ключі Доступу',
        yourPasskeys: 'Ваші ключі',

        featureSupports: 'Cash Track підтримує',
        featureSupportsPasskeys: 'Ключі Доступу (Passkeys)',
        featureSupportsIdentity: 'як ще один спосіб підтвердження вашої особи. За допомогою ключів доступу можливий "Безпарольний" вхід.',
        featureSupportsInfo: 'Щойно ви додасте новий ключ доступу до вашого профілю - ви зможете входити у ваш профіль в один клік. Ключі доступу зазвичай використовують перевірку особи (FaceID, TouchID, Windows Hello та інші..) або ж фізичні USB ключі.',

        keyName: 'Назва',
        keyNameDescription: 'Назва ключа доступу або і\'мя пристрою',
        addPasskey: 'Додати Ключ Доступу',
        addClientError: 'Ключ Доступу не був створений. Будь ласка, спробуйте ще раз.',
        addClientErrorAgain: 'Неможливо створити ключ доступу. Ваш пристрій або браузер не підтримується або виникла інша помилка під час створення ключа доступу. Будь ласка, обирайте інші способи автентифікації.',
        delete: 'Видалити',
        deleteConfirm: 'Ви справді хочете видалити ключ доступу "{name}"? Ключ все ще існуватиме на вашому пристрої.',
        created: 'Створений',
        used: 'Використаний',
        usedAtNever: 'ніколи',

        infoNotSupported: 'Будь ласка, використовуйте інший спосіб автентифікації. Ваш браузер або пристрій не підтримує Ключі Доступу.',
        infoNotSupportedSee: 'Подивитись',
        infoNotSupportedDeviceSupport: 'Перелік підтримуванийх пристроїв',
        infoNotSupportedMoreInfo: 'для додаткової інформації',
    },

    profileSettings: {
        profileSettings: 'Налаштування Профілю',
        name: 'Ім\'я',
        nameDescription: 'Як до Вас звертатись?',
        lastName: 'Прізвище',
        lastNameDescription: 'Необов\'язково, проте з ним виглядає краще.',
        nickName: 'Нік',
        nickNameDescription: 'Ваша унікальна ідентифікація. Буде використовуватись для URL адрес, тегів та інше.',
        defaultCurrency: 'Валюта',
        defaultCurrencyDescription: 'Ваша локальна валюта, яку Ви використовуєте зазвичай. Валюта за замовчуванням для нових гаманців.',
        language: 'Мова',
        languageDescription: 'Оберіть мову інтерфейсу зі списку доступних.',
        save: 'Зберегти',
        success: 'Ваш профіль успішно оновлено.',
        social: 'Профілі Соціальних Мереж',
    },

    profile: {
        profile: 'Профіль',
        latestWallets: 'Нещодавні Гаманці',
        commonTags: 'Спільні Теги',

        chargesFlowLoadingError: 'Помилка під час завантаження статистики витрат. Ремонтна бригада вже виїхала. Будь ласка, спробуйте пізніше.',
        chargesFlowNotice: 'Наразі статистика не відображає доходів та витрат з гаманців, валюта яких відрізняється від Вашої типової валюти. Ми працюємо над цим.',

        income: 'Доходи',
        expense: 'Витрати',
        allTime: 'Весь час',
        year: 'Рік',
        quarter: 'Квартал',
        month: 'Місяць',

        emailNotConfirmed: 'Профіль не підтверджено',
        emailNotConfirmedMainMessage: 'Будь ласка, перевірте Вашу поштову скриньку (можливо також папку Спам). Вам надіслано лист з посиланням для підтверждження Email. Використовуючи посилання - підтверьте Ваш профіль. Наразі Ваші можливості обмежено.',
        emailNotConfirmedResendMessage: 'Ви можете повторно надіслати лист з інструкцією для підтвердження профілю перейшовши до налаштувань профілю.',

        counters: 'Лічильники',
        totalWalletsAmount: 'Кількість гаманців',
        archivedWalletsAmount: 'Кількість гаманців в архіві',
        totalChargesAmount: 'Кількість операцій з доходів та витрат',
        incomeChargesAmount: 'Кількість операцій з доходами',
        expenseChargesAmount: 'Кількість операцій з витратами',
    },

    wallets: {
        wallets: 'Гаманці',
        newWallet: 'Новий Гаманець',
        active: 'активний',
        activeTitle: 'Активні',
        archived: 'в архіві',
        archivedTitle: 'В Архіві',
        moreMembers: 'та інші учасники..',
        listLoadingError: 'Помилка під час завантаження гаманців. Ремонтна бригада вже виїхала. Будь ласка, спробуйте пізніше.',
        noWallets: 'Немає Гаманців',
        noWalletsMessage: 'У Вас, покищо, немає жодного гаманця. Непоганий час для створення першого.',
        noWalletsCreate: 'Створити',
        clear: 'Очистити',

        loadingError: 'Помилка під час завантаження гаманця. Ремонтна бригада вже виїхала. Будь ласка, спробуйте пізніше.',
        edit: 'Змінити',
        moreActions: 'Більше дій',
        share: 'Поділитись',
        activate: 'Активувати',
        disable: 'Деактивувати',
        toArchive: 'В Архів',
        unArchive: 'З Архіву',
        delete: 'Видалити',
        available: 'Доступно',
        income: 'Доходи',
        expense: 'Витрати',
        graph: 'Графік',
        filters: 'Фільтри',

        groupBy: 'Групувати за',
        groupByDay: 'День',
        groupByMonth: 'Місяць',
        groupByYear: 'Рік',
        chartLoadingError: 'Помилка під час завантаження графіку. Ремонтна бригада вже виїхала. Будь ласка, спробуйте пізніше.',

        createTitle: 'Створити Гаманець',
        editTitle: 'Змінити Гаманець',
        formName: 'Назва',
        formCurrency: 'Валюта',
        formCurrencyDescription: 'Валюта за замовчуванням для гаманця і кожної операції.',
        create: 'Створити',
        update: 'Змінити',
        cancel: 'Відміна',

        shareTitle: 'Спільні користувачі гаманця',
        shareMembersLoadingError: 'Помилка під час завантаження користувачів гаманця. Ремонтна бригада вже виїхала. Будь ласка, спробуйте пізніше.',
        shareCommonUsers: 'Ви можете знати цих користувачів, так як вже маєте з ними спільні гаманці',
        shareSelect: 'Обрати',
        shareEmailHint: 'Введіть Email вже зареєстрованого користувача на Cash Track, щоб поділитись з ним доступом в гаманець',
        shareSearch: 'Знайти',
        shareInvite: 'Запросити',
        shareSearchError: 'Користувача не знайдено',
        shareCancelInvite: 'Скасувати доступ користувача в гаманець {0}',
    },

    charges: {
        edit: 'Змінити',
        delete: 'Видалити',
        deletingConfirm: 'Ви впевнені?',

        new: 'Додати Операцію',
        amount: 'Сума',
        title: 'Назва',
        description: 'Деталі',
        create: 'Створити',
        update: 'Змінити',
        cancel: 'Відміна',
        changeDescription: 'Змінити деталі',
        changeDate: 'Змінити дату',

        loading: 'Завантаження Операцій..',
        loadingError: 'Помилка під час завантаження операцій. Ремонтна бригада вже виїхала. Будь ласка, спробуйте пізніше.',
        loadingMore: 'Завантаження..',
        loadingMoreError: 'Помилка під час завантаження більше операцій. Ремонтна бригада вже виїхала. Будь ласка, спробуйте пізніше.',

        filterFrom: 'З',
        filterInputFrom: 'Дата з',
        filterTo: 'До',
        filterInputTo: 'Дата до',

        move: 'Перемістити До',
        moveError: 'Помилка перенесення обраних операцій у гаманець. Будь ласка, спробуйте пізніше.',
    },

    tags: {
        tags: 'Теги',
        addNew: 'Додати новий тег',
        inputLabel: 'Назва тегу',
        inputHelpLine1: 'Спробуйте додати емоджі на початку назви, наприклад: 🥦 Продукти',
        inputHelpLine2: 'Емоджі - завжди хороший спосіб швидше знаходити ваші теги. А ще це просто красиво.',
        inputHelpLine3: 'Ще один спосіб виділити тег - змінити його колір. Тисніть квадратну кнопку перед введеною назвою.',
        editHelpLine1: 'Натисніть на тег, щоб видалити. Пов\'язані операції залишаться.',
        editInfoLine1: 'Cтворені вами теги доступні користувачам, з якими у вас є принаймні один спільний гаманець.',
        editInfoLine2: 'Проте, редагувати або видалити їх вони не зможуть.',
        create: 'Створити',
        update: 'Зберегти',
        deletingConfirm: 'Ви справді хочете видалити тег "{0}"?',
        autocompleteHint: 'Розпочніть з введення назви, щоб знайти або створити тег..',

        stats: 'Статистика за тегами',
        statsLoadingError: 'Помилка під час завантаження тегів. Ремонтна бригада вже виїхала. Будь ласка, спробуйте пізніше.',
    }
};
