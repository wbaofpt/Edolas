package vn.edolas.telemetry.transport;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public final class HttpTelemetryTransport implements TelemetryTransport {
    private final HttpClient client;

    public HttpTelemetryTransport(int connectTimeoutSeconds) {
        client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(connectTimeoutSeconds))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    }

    @Override
    public java.util.concurrent.CompletableFuture<Integer> send(TelemetryRequest request) {
        var httpRequest = HttpRequest.newBuilder(request.endpoint())
            .timeout(request.timeout())
            .header("Content-Type", "application/json")
            .header("X-Edolas-Server-Id", request.serverId())
            .header("X-Edolas-Timestamp", request.timestamp())
            .header("X-Edolas-Nonce", request.nonce())
            .header("X-Edolas-Signature", request.signature())
            .POST(HttpRequest.BodyPublishers.ofString(request.body(), java.nio.charset.StandardCharsets.UTF_8))
            .build();
        return client.sendAsync(httpRequest, HttpResponse.BodyHandlers.discarding()).thenApply(HttpResponse::statusCode);
    }
}
