use crate::mcp::sonarqube::tools::SONARQUBE_CLIENT;

/// Resets the global SonarQube client for testing purposes
///
/// This function removes the current client instance from the global state,
/// ensuring a clean state before each test. It also includes a small delay
/// and memory fence to ensure all threads observe the change.
pub fn reset_sonarqube_client() {
    let mut guard = SONARQUBE_CLIENT.lock().unwrap();
    let _ = guard.take();
    std::sync::atomic::fence(std::sync::atomic::Ordering::SeqCst);
    std::thread::sleep(std::time::Duration::from_millis(10));
}
