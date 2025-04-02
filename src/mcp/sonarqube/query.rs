/// Query building utilities for SonarQube API requests
///
/// This module provides a query builder pattern for constructing URL parameters
/// for SonarQube API requests in a structured and maintainable way.
use std::fmt::Display;

/// A builder for constructing URL query parameters in a structured way
///
/// This struct helps reduce cyclomatic complexity in API client functions
/// by encapsulating the logic for building URL queries with many optional
/// parameters. It handles different parameter types (string, boolean, array)
/// and ensures proper URL encoding.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct QueryBuilder {
    /// The base URL including the endpoint path
    base_url: String,
    /// Whether the first parameter has been added (affects & vs ? separator)
    has_params: bool,
}

#[allow(dead_code)]
impl QueryBuilder {
    /// Create a new QueryBuilder with the given base URL
    ///
    /// # Arguments
    ///
    /// * `base_url` - The base URL including the endpoint path but without query parameters
    ///
    /// # Returns
    ///
    /// A new QueryBuilder instance
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            has_params: false,
        }
    }

    /// Add a parameter to the URL if the value is Some, otherwise skip it
    ///
    /// # Arguments
    ///
    /// * `name` - Parameter name
    /// * `value` - Optional parameter value
    ///
    /// # Returns
    ///
    /// Self for method chaining
    pub fn add_param<T: Display>(mut self, name: &str, value: Option<T>) -> Self {
        if let Some(val) = value {
            let separator = if self.has_params { "&" } else { "?" };
            self.base_url.push_str(&format!(
                "{}{}{}",
                separator,
                name,
                encode_value(&val.to_string())
            ));
            self.has_params = true;
        }
        self
    }

    /// Add a boolean parameter to the URL if the value is Some, otherwise skip it
    ///
    /// # Arguments
    ///
    /// * `name` - Parameter name
    /// * `value` - Optional boolean value
    ///
    /// # Returns
    ///
    /// Self for method chaining
    pub fn add_bool_param(self, name: &str, value: Option<bool>) -> Self {
        self.add_param(name, value)
    }

    /// Add an array parameter as comma-separated values if the array is Some and not empty
    ///
    /// # Arguments
    ///
    /// * `name` - Parameter name
    /// * `values` - Optional array of values
    ///
    /// # Returns
    ///
    /// Self for method chaining
    pub fn add_array_param<T: Display>(self, name: &str, values: Option<&[T]>) -> Self {
        if let Some(vals) = values {
            if !vals.is_empty() {
                let joined = vals
                    .iter()
                    .map(|v| v.to_string())
                    .collect::<Vec<_>>()
                    .join(",");
                return self.add_param(name, Some(joined));
            }
        }
        self
    }

    /// Add multiple parameters from a collection using a mapping function
    ///
    /// # Arguments
    ///
    /// * `params` - A collection of (name, value) tuples
    ///
    /// # Returns
    ///
    /// Self for method chaining
    pub fn add_params<I, K, V>(mut self, params: I) -> Self
    where
        I: IntoIterator<Item = (K, Option<V>)>,
        K: AsRef<str>,
        V: Display,
    {
        for (name, value) in params {
            self = self.add_param(name.as_ref(), value);
        }
        self
    }

    /// Build the final URL string
    ///
    /// # Returns
    ///
    /// The complete URL with all parameters
    pub fn build(self) -> String {
        self.base_url
    }
}

/// Helper function to encode parameter values properly
///
/// # Arguments
///
/// * `value` - The parameter value to encode
///
/// # Returns
///
/// The encoded parameter string in format "=encoded_value"
#[allow(dead_code)]
fn encode_value(value: &str) -> String {
    format!("={}", urlencoding::encode(value))
}
