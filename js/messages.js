/* messages.js */
// ============================================
// PShop - Messages Page
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    Auth.requireAuth();
    initMessaging();
    loadConversations();
});

function initMessaging() {
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const messageInput = document.getElementById('messageInput');

    // Send message
    const send = async () => {
        const text = messageInput.value.trim();
        if (!text) return;

        const chatMessages = document.getElementById('chatMessages');

        // Add user message
        chatMessages.innerHTML += `
            <div class="chat-message sent">
                <div class="chat-bubble">${Utils.htmlEscape(text)}</div>
            </div>
        `;

        messageInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Save & send to API
        const user = Auth.getUser();
        try {
            await ApiService.sendMessage({
                userId: user?.id,
                message: text,
                date: new Date().toISOString()
            });
        } catch (e) {
            // Continue anyway
        }

        // Simulate support reply
        setTimeout(() => {
            chatMessages.innerHTML += `
                <div class="chat-message received">
                    <div class="chat-bubble">
                        Thank you for your message! Our team will get back to you shortly. Is there anything else I can help you with?
                    </div>
                </div>
            `;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1500);
    };

    sendMessageBtn?.addEventListener('click', send);
    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') send();
    });

    // New message modal
    const newMsgBtn = document.getElementById('newMessageBtn');
    const newMsgModal = document.getElementById('newMessageModal');
    const closeMsgModal = document.getElementById('closeNewMsgModal');

    newMsgBtn?.addEventListener('click', () => {
        newMsgModal.classList.add('show');
    });

    closeMsgModal?.addEventListener('click', () => {
        newMsgModal.classList.remove('show');
    });

    newMsgModal?.addEventListener('click', (e) => {
        if (e.target === newMsgModal) newMsgModal.classList.remove('show');
    });

    // New message form
    document.getElementById('newMessageForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subject = document.getElementById('msgSubject').value;
        const body = document.getElementById('msgBody').value;

        const user = Auth.getUser();
        try {
            await ApiService.sendMessage({
                userId: user?.id,
                subject,
                message: body,
                date: new Date().toISOString()
            });
        } catch (e) {
            // Continue
        }

        Utils.showToast('Message sent successfully!', 'success');
        newMsgModal.classList.remove('show');
        e.target.reset();
    });
}

function loadConversations() {
    const list = document.getElementById('conversationList');
    list.innerHTML = `
        <div class="message-thread active">
            <span class="time">Now</span>
            <h4>PShop Support</h4>
            <p>Hello! How can we help you today?</p>
        </div>
        <div class="message-thread">
            <span class="time">2d ago</span>
            <h4>Order #ORD-1234</h4>
            <p>Your order has been shipped</p>
        </div>
        <div class="message-thread">
            <span class="time">1w ago</span>
            <h4>Promotions</h4>
            <p>New deals available!</p>
        </div>
    `;
}