/** @type {import('next').NextConfig} */
const nextConfig = {
    // Додаємо цей блок, щоб збільшити ліміт на розмір тіла запиту
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb', // Можна поставити і більше, наприклад, '20mb'
        },
    },
};

module.exports = nextConfig;