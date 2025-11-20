import { jsx } from 'hono/jsx'
import { User } from '../db/schema'

export const UserPanel = ({ user }: { user: User }) => {
    // FIX: Data/Time Display - Convert to ISO string for client-side parsing
    const expiryISO = new Date(`${user.expirationDate}T${user.expirationTime}Z`).toISOString();

    return (
        <html>
            <head>
                <title>User Panel</title>
                <script src="https://unpkg.com/htmx.org@1.9.12"></script>
                <script src="https://unpkg.com/alpinejs@3.14.0" defer></script>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
            </head>
            <body class="bg-gray-900 text-white p-8">
                <div class="max-w-4xl mx-auto">
                    <h1 class="text-3xl font-bold mb-4">VLESS User Panel</h1>
                    <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 class="text-xl font-semibold mb-4">Welcome, {user.uuid}</h2>
                        <div hx-get={`/api/user/${user.uuid}/stats`} hx-trigger="every 5s">
                            {/* Stats will be loaded here by HTMX */}
                        </div>
                        <div x-data="{ qrCodeUrl: '' }">
                            <button {...{'@click': "qrCodeUrl = `/api/qr?data=...`"}} class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                                Show QR Code
                            </button>
                            <template x-if="qrCodeUrl">
                                <img {...{':src': 'qrCodeUrl'}} />
                            </template>
                        </div>
                         <div x-data="{ timeLeft: '' }" x-init="
                            const expiry = new Date('{expiryISO}');
                            setInterval(() => {
                                const now = new Date();
                                const diff = expiry.getTime() - now.getTime();
                                if (diff < 0) {
                                    timeLeft = 'Expired';
                                } else {
                                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                                    timeLeft = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                                }
                            }, 1000);
                        ">
                            <p>Time Remaining: <span x-text="timeLeft"></span></p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
