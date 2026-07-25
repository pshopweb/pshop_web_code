/* signup.js */
// ============================================
// PShop - Signup Page
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (Auth.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');
    const passwordInput = document.getElementById('password');
    const strengthEl = document.getElementById('passwordStrength');

    // Password strength indicator
    if (passwordInput && strengthEl) {
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            let strength = 0;

            if (val.length >= 6) strength++;
            if (val.length >= 8) strength++;
            if (/[A-Z]/.test(val) && /[0-9]/.test(val)) strength++;
            if (/[^A-Za-z0-9]/.test(val)) strength++;

            strengthEl.className = 'password-strength';
            if (val.length > 0) {
                if (strength <= 1) strengthEl.classList.add('weak');
                else if (strength <= 2) strengthEl.classList.add('medium');
                else strengthEl.classList.add('strong');
            }
        });
    }

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        // Validation
        if (!firstName || !lastName || !email || !password) {
            Utils.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.showToast('Please enter a valid email', 'error');
            return;
        }

        if (password.length < 6) {
            Utils.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            Utils.showToast('Passwords do not match', 'error');
            return;
        }

        if (!agreeTerms) {
            Utils.showToast('Please agree to the terms & conditions', 'error');
            return;
        }

        signupBtn.disabled = true;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

        const result = await Auth.signup({
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            email,
            phone,
            password
        });

        signupBtn.disabled = false;
        signupBtn.innerHTML = '<span class="btn-text">Create Account</span><i class="fas fa-user-plus"></i>';

        if (result.success) {
            Utils.showToast('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        } else {
            Utils.showToast(result.message, 'error');
        }
    });

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            const icon = btn.querySelector('i');
            if (target.type === 'password') {
                target.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                target.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
});