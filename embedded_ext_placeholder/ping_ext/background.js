function tryConnect() {
  let port;
  try {
    port = chrome.runtime.connectNative('com.example.echo');
  } catch (e) {
    console.error('connectNative failed', e);
    setTimeout(tryConnect, 5000);
    return;
  }
  port.postMessage({ text: 'hello' });
  port.onMessage.addListener(msg => {
    console.log('Received from native host', msg);
  });
}
chrome.runtime.onStartup.addListener(tryConnect);
chrome.runtime.onInstalled.addListener(tryConnect);
