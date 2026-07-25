/* profile.js */
// ============================================
// PShop - Profile Page
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireAuth();
    loadProfile();
    initProfileEdit();
});

function loadProfile() {
    const user = Auth.getUser();
    if (!user) return;

    document.getElementById('displayName').textContent = user.name || '-';
    document.getElementById('displayEmail').textContent = user.email || '-';
    document.getElementById('displayPhone').textContent = user.phone || '-';
    document.getElementById('displayJoined').textContent = user.joined ? Utils.formatDate(user.joined) : '-';
    document.getElementById('displayAddress').textContent = user.address || '-';

    // Profile avatar initials
    if (user.name) {
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        document.querySelector('.avatar').textContent = initials;
    }

    // Load orders count
    const orders = JSON.parse(localStorage.getItem('pshop_orders') || '[]');
    document.getElementById('totalOrders').textContent = orders.length;
}

function initProfileEdit() {
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const form = document.getElementById('profileEditForm');
    const info = document.getElementById('profileInfo');

    editBtn?.addEventListener('click', () => {
        const user = Auth.getUser();
        if (!user) return;

        const nameParts = (user.name || '').split(' ');
        document.getElementById('editFirstName').value = nameParts[0] || '';
        document.getElementById('editLastName').value = nameParts.slice(1).join(' ') || '';
        document.getElementById('editPhone').value = user.phone || '';
        document.getElementById('editAddress').value = user.address || '';

        info.style.display = 'none';
        form.style.display = 'block';
        editBtn.style.display = 'none';
    });

    cancelBtn?.addEventListener('click', () => {
        info.style.display = 'block';
        form.style.display = 'none';
        editBtn.style.display = 'inline-flex';
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('editFirstName').value.trim();
        const lastName = document.getElementById('editLastName').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        const address = document.getElementById('editAddress').value.trim();

        const user = Auth.getUser();
        user.firstName = firstName;
        user.lastName = lastName;
        user.name = `${firstName} ${lastName}`.trim();
        user.phone = phone;
        user.address = address;

        Auth.setUser(user);

        try {
            await ApiService.updateProfile({
                userId: user.id,
                ...user
            });
        } catch (e) {
            // Continue with local update
        }

        loadProfile();

        info.style.display = 'block';
        form.style.display = 'none';
        editBtn.style.display = 'inline-flex';

        Utils.showToast('Profile updated successfully!', 'success');
    });
}