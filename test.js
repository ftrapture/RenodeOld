import axios from 'axios';
async function test() {
    const youtubeUrl = 'https://rr1---sn-fpnioxu-jj06.googlevideo.com/videoplayback?expire=1748725944&ei=WBw7aIryA8bElu8P1LfZGA&ip=35.223.106.127&id=o-ADrVJqrkqicm5ML8nkoVEJtCniG_tkVEAJ5G2rUWP9RA&itag=251&source=youtube&requiressl=yes&xpc=EgVo2aDSNQ%3D%3D&rms=au%2Cau&pcm2=no&bui=AY1jyLMDGhjesw9G-5bRWJdj4qbHldv98KESmJgIDNxHs6TXJj-YngsL8YUWtRE4QEImB3onZy02UMaH&vprv=1&svpuc=1&mime=audio%2Fwebm&ns=yr1sRDSolLOqrWg_BN9KX_YQ&rqh=1&gir=yes&clen=3230456&dur=200.401&lmt=1746661071954755&keepalive=yes&lmw=1&c=TVHTML5&sefc=1&txp=4532534&n=V8VZizGkHIr8Wg&sparams=expire%2Cei%2Cip%2Cid%2Citag%2Csource%2Crequiressl%2Cxpc%2Cpcm2%2Cbui%2Cvprv%2Csvpuc%2Cmime%2Cns%2Crqh%2Cgir%2Cclen%2Cdur%2Clmt&sig=AJfQdSswRAIge8eclaAy87SguR2-jELMLzUjSpNDQUCNB5Fx4Fn0zQ4CICUjSid0pU4Pz2CKwNdH_fiT2V07UuR3lL-FRXTy6fDy&redirect_counter=1&rm=sn-qxos67z&rrc=104&fexp=24350590,24350737,24350827,24350961,24351064,24351173,24351312,24351314,24351495,24351528,24351594,24351638,24351658,24351660,24351759,24351789,24351864,24351907,24352018,24352020,24352030,24352187&req_id=c137eddfa859a3ee&cms_redirect=yes&ipbypass=yes&met=1748706003,&mh=La&mip=223.223.143.104&mm=31&mn=sn-fpnioxu-jj06&ms=au&mt=1748705576&mv=m&mvi=1&pl=21&lsparams=ipbypass,met,mh,mip,mm,mn,ms,mv,mvi,pl,rms&lsig=APaTxxMwRQIhAKE6QYFaCeimJwd92J4H7etd3y0xe8OIUvDZT-G87kCgAiAR5Nkb_3kXCszH4LjhJsNRV5_3gSngFTWcGXpj21OOKg%3D%3D&ratebypass=yes&range=0-';
    
    console.log('🔍 Testing YouTube URL...');
    
    try {
        
        console.log('\n🚀 Starting stream download...');
        const streamResponse = await axios.get(youtubeUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            responseType: 'stream', // KEY: This makes it return a stream, not buffer everything
            timeout: 15000
        });
        
        console.log('✅ Stream started successfully!');
        
        
        let totalBytes = 0;
        streamResponse.data.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (totalBytes % (100 * 1024) < chunk.length) { // Log every 100KB
                console.log(`📈 Downloaded: ${Math.round(totalBytes / 1024)}KB`, chunk);
            }
        });
    } catch (err) {
        console.error('❌ Error:', err.message);
        
        if (err.response) {
            console.error('   Status:', err.response.status, err.response.statusText);
        }
        
        if (err.code) {
            console.error('   Code:', err.code);
        }
    }
}

test();