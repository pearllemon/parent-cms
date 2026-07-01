async function check() {
  const url = 'https://deepakshukla.com/wp-content/uploads/2018/06/Monogram-new-150x150.png';
  try {
    const res = await fetch(url);
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status} ${res.statusText}`);
  } catch (e) {
    console.error('Error fetching:', e.message);
  }
}

check();
