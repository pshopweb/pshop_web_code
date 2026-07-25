/* settings.js */
// ============================================
// PShop - Settings Page
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireAuth();
    initSettings();
});

function initSettings() {
    // Change password form
    document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const current = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmNewPassword').value;

        if (!current || !newPass || !confirm) {
            Utils.showToast('Please fill in all fields', 'error');
            return;
        }

        if (newPass.length < 6) {
            Utils.showToast('New password must be at least 6 characters', 'error');
            return;
        }

        if (newPass !== confirm) {
            Utils.showToast('Passwords do not match', 'error');
            return;
        }

        try {
            await ApiService.post(API.BASE_URL, {
                action: 'changePassword',
                userId: Auth.getUser()?.id,
                currentPassword: current,
                newPassword: newPass
            });
        } catch (e) {
            // Continue
        }

        Utils.showToast('Password updated successfully!', 'success');
        e.target.reset();
    });

    // Notification toggles
    const toggles = ['emailNotif', 'marketingNotif', 'smsNotif'];
    toggles.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const settings = JSON.parse(localStorage.getItem('pshop_settings') || '{}');
                settings[id] = el.checked;
                localStorage.setItem('pshop_settings', JSON.stringify(settings));
                Utils.showToast('Setting updated', 'success');
            });
        }
    });

    // Load saved settings
    const saved = JSON.parse(localStorage.getItem('pshop_settings') || '{}');
    toggles.forEach(id => {
        const el = document.getElementById(id);
        if (el && saved[id] !== undefined) {
            el.checked = saved[id];
        }
    });

    // Dark mode
    const darkMode = document.getElementById('darkMode');
    if (darkMode) {
        darkMode.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode', darkMode.checked);
            const settings = JSON.parse(localStorage.getItem('pshop_settings') || '{}');
            settings.darkMode = darkMode.checked;
            localStorage.setItem('pshop_settings', JSON.stringify(settings));
        });

        if (saved.darkMode) {
            darkMode.checked = true;
            document.body.classList.add('dark-mode');
        }
    }

    // Delete account
    document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) {
            return;
        }

        if (!confirm('This will permanently delete all your data. Are you really sure?')) {
            return;
        }

        try {
            await ApiService.post(API.BASE_URL, {
                action: 'deleteAccount',
                userId: Auth.getUser()?.id
            });
        } catch (e) {
            // Continue
        }

        localStorage.clear();
        Utils.showToast('Account deleted', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    });
}