package vn.edolas.telemetry.delivery;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import vn.edolas.telemetry.config.TelemetryConfig;
import vn.edolas.telemetry.security.RequestSigner;

public interface CommandDeliveryClient extends AutoCloseable {
    Optional<CommandDelivery> claim();

    void complete(long deliveryId, String claimToken, boolean success, String output);

    static CommandDeliveryClient create(TelemetryConfig config) {
        return new HttpCommandDeliveryClient(config);
    }

    @Override
    default void close() {}
}

final class HttpCommandDeliveryClient implements CommandDeliveryClient {
    private static final int MAX_RESPONSE_BYTES = 16 * 1024;

    private final TelemetryConfig config;
    private final HttpClient client;
    private final Gson gson = new Gson();

    HttpCommandDeliveryClient(TelemetryConfig config) {
        this.config = config;
        client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(config.connectTimeoutSeconds()))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    }

    @Override
    public Optional<CommandDelivery> claim() {
        Response response = post(new ClaimRequest(1, "claim"));
        if (response.status() == 204) return Optional.empty();
        if (response.status() != 200) throw new DeliveryRequestException("Delivery claim was rejected.");
        try {
            JsonObject delivery = JsonParser.parseString(response.body()).getAsJsonObject().getAsJsonObject("delivery");
            return Optional.of(new CommandDelivery(
                delivery.get("deliveryId").getAsLong(),
                delivery.get("claimToken").getAsString(),
                delivery.get("command").getAsString()
            ));
        } catch (RuntimeException exception) {
            throw new DeliveryRequestException("Delivery claim response is invalid.", exception);
        }
    }

    @Override
    public void complete(long deliveryId, String claimToken, boolean success, String output) {
        if (deliveryId < 1 || output.length() > 500) throw new IllegalArgumentException("Delivery completion is invalid.");
        Response response = post(new CompleteRequest(1, "complete", deliveryId, claimToken, success, output));
        if (response.status() != 202) throw new DeliveryRequestException("Delivery completion was rejected.");
    }

    @Override
    public void close() {
        client.close();
    }

    private Response post(Object body) {
        String rawBody = gson.toJson(body);
        String timestamp = Long.toString(System.currentTimeMillis() / 1_000);
        String nonce = UUID.randomUUID().toString();
        String signature = RequestSigner.signature(config.apiKey(), RequestSigner.canonical(config.serverId(), timestamp, nonce, rawBody));
        HttpRequest request = HttpRequest.newBuilder(config.deliveryEndpoint())
            .timeout(Duration.ofSeconds(config.requestTimeoutSeconds()))
            .header("Content-Type", "application/json")
            .header("X-Edolas-Server-Id", config.serverId())
            .header("X-Edolas-Timestamp", timestamp)
            .header("X-Edolas-Nonce", nonce)
            .header("X-Edolas-Signature", signature)
            .POST(HttpRequest.BodyPublishers.ofString(rawBody, StandardCharsets.UTF_8))
            .build();
        try {
            HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
            return new Response(response.statusCode(), readBounded(response.body()));
        } catch (IOException exception) {
            throw new DeliveryRequestException("Delivery HTTP request failed.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new DeliveryRequestException("Delivery HTTP request interrupted.", exception);
        }
    }

    private static String readBounded(InputStream input) throws IOException {
        try (input) {
            byte[] bytes = input.readNBytes(MAX_RESPONSE_BYTES + 1);
            if (bytes.length > MAX_RESPONSE_BYTES) throw new IOException("Delivery response is too large.");
            return new String(bytes, StandardCharsets.UTF_8);
        }
    }

    private record ClaimRequest(int schemaVersion, String action) {}

    private record CompleteRequest(int schemaVersion, String action, long deliveryId, String claimToken, boolean success, String output) {}

    private record Response(int status, String body) {}
}

final class DeliveryRequestException extends RuntimeException {
    DeliveryRequestException(String message) {
        super(message);
    }

    DeliveryRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
