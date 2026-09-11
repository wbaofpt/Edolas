package vn.edolas.telemetry.config;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public final class TelemetryConfig {
    private static final Pattern ID_PATTERN = Pattern.compile("^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$");

    private final String serverId;
    private final String group;
    private final String displayName;
    private final URI endpoint;
    private final URI deliveryEndpoint;
    private final String apiKey;
    private final int intervalSeconds;
    private final int deliveryIntervalSeconds;
    private final int connectTimeoutSeconds;
    private final int requestTimeoutSeconds;
    private final List<String> criticalPlugins;

    private TelemetryConfig(String serverId, String group, String displayName, URI endpoint, URI deliveryEndpoint, String apiKey, int intervalSeconds, int deliveryIntervalSeconds, int connectTimeoutSeconds, int requestTimeoutSeconds, List<String> criticalPlugins) {
        this.serverId = serverId;
        this.group = group;
        this.displayName = displayName;
        this.endpoint = endpoint;
        this.deliveryEndpoint = deliveryEndpoint;
        this.apiKey = apiKey;
        this.intervalSeconds = intervalSeconds;
        this.deliveryIntervalSeconds = deliveryIntervalSeconds;
        this.connectTimeoutSeconds = connectTimeoutSeconds;
        this.requestTimeoutSeconds = requestTimeoutSeconds;
        this.criticalPlugins = List.copyOf(criticalPlugins);
    }

    public static TelemetryConfig from(Map<String, Object> values) {
        String serverId = id(values.get("server-id"), "server-id");
        String group = id(values.get("group"), "group");
        String displayName = text(values.get("display-name"), "display-name", 80);
        URI endpoint = endpoint(values.get("endpoint"));
        URI deliveryEndpoint = optionalDeliveryEndpoint(values.get("delivery-endpoint"), endpoint);
        String apiKey = text(values.get("api-key"), "api-key", 512);
        if (apiKey.getBytes(StandardCharsets.UTF_8).length < 32) throw new IllegalArgumentException("api-key must contain at least 32 UTF-8 bytes.");
        if (apiKey.startsWith("replace-with-")) throw new IllegalArgumentException("api-key is still using the bundled placeholder.");
        int interval = boundedInt(values.get("interval-seconds"), "interval-seconds", 5, 60);
        int deliveryInterval = boundedInt(values.get("delivery-interval-seconds"), "delivery-interval-seconds", 1, 60);
        int connectTimeout = boundedInt(values.get("connect-timeout-seconds"), "connect-timeout-seconds", 1, 30);
        int requestTimeout = boundedInt(values.get("request-timeout-seconds"), "request-timeout-seconds", 1, 60);
        List<String> plugins = stringList(values.get("critical-plugins"));
        return new TelemetryConfig(serverId, group, displayName, endpoint, deliveryEndpoint, apiKey, interval, deliveryInterval, connectTimeout, requestTimeout, plugins);
    }

    private static String id(Object value, String field) {
        String result = text(value, field, 40);
        if (!ID_PATTERN.matcher(result).matches()) throw new IllegalArgumentException(field + " is invalid.");
        return result;
    }

    private static String text(Object value, String field, int max) {
        if (!(value instanceof String string)) throw new IllegalArgumentException(field + " must be a string.");
        String result = string.trim();
        if (result.isEmpty() || result.length() > max) throw new IllegalArgumentException(field + " is invalid.");
        return result;
    }

    private static int boundedInt(Object value, String field, int min, int max) {
        if (!(value instanceof Number number)) throw new IllegalArgumentException(field + " must be a number.");
        int result = number.intValue();
        if (result < min || result > max) throw new IllegalArgumentException(field + " is outside the allowed range.");
        return result;
    }

    private static URI endpoint(Object value) {
        return endpoint(value, "endpoint");
    }

    private static URI endpoint(Object value, String field) {
        URI uri;
        try {
            uri = URI.create(text(value, field, 2048));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(field + " is invalid.", exception);
        }
        String host = uri.getHost();
        boolean local = "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host) || "::1".equals(host);
        if (!"https".equalsIgnoreCase(uri.getScheme()) && !(local && "http".equalsIgnoreCase(uri.getScheme()))) {
            throw new IllegalArgumentException(field + " must use HTTPS outside localhost.");
        }
        return uri;
    }

    private static URI optionalDeliveryEndpoint(Object value, URI telemetryEndpoint) {
        if (value instanceof String string && !string.isBlank()) return endpoint(string, "delivery-endpoint");
        return telemetryEndpoint.resolve("./deliveries");
    }

    private static List<String> stringList(Object value) {
        if (!(value instanceof List<?> list) || list.size() > 128) throw new IllegalArgumentException("critical-plugins must be a list with at most 128 items.");
        var unique = new LinkedHashSet<String>();
        for (Object item : list) unique.add(text(item, "critical-plugins item", 64));
        return new ArrayList<>(unique);
    }

    public String serverId() { return serverId; }
    public String group() { return group; }
    public String displayName() { return displayName; }
    public URI endpoint() { return endpoint; }
    public URI deliveryEndpoint() { return deliveryEndpoint; }
    public String apiKey() { return apiKey; }
    public int intervalSeconds() { return intervalSeconds; }
    public int deliveryIntervalSeconds() { return deliveryIntervalSeconds; }
    public int connectTimeoutSeconds() { return connectTimeoutSeconds; }
    public int requestTimeoutSeconds() { return requestTimeoutSeconds; }
    public List<String> criticalPlugins() { return criticalPlugins; }

    @Override
    public String toString() {
        return "TelemetryConfig[serverId=" + serverId + ", group=" + group + ", endpoint=" + endpoint + ", apiKey=<redacted>]";
    }
}
