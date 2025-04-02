use crate::mcp::sonarqube::tools::SONARQUBE_CLIENT;

pub fn reset_sonarqube_client() {
    let mut guard = SONARQUBE_CLIENT.lock().unwrap();
    let _ = guard.take();
    std::sync::atomic::fence(std::sync::atomic::Ordering::SeqCst);
    std::thread::sleep(std::time::Duration::from_millis(10));
}
