import schedule from 'node-schedule';

const job = schedule.scheduleJob('8 * * * *', async () => {
    try {
        console.log('syncing courses begin uwu')
        const res = await fetch('http://localhost:8080/api/scrape-archived-courses?semester=11310', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
        });
        console.log('syncing courses end uwu')
    } catch (e) {
        console.error('error calling scrape-courses', e);
    }
});

// handle close job
process.on('SIGINT', () => {
    job.cancel();
    process.exit();
});