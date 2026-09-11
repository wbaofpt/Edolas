package vn.edolas.telemetry.delivery;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import vn.edolas.telemetry.config.TelemetryConfig;
import vn.edolas.telemetry.security.RequestSigner;

class HttpCommandDeliveryClientTest {
    @Test
    void signsClaimAndCompletionRequests() throws Exception {
        var requests = new ArrayList<CapturedRequest>();
        var requestCount = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/deliveries", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            requests.add(new CapturedRequest(
                body,
                exchange.getRequestHeaders().getFirst("X-Edolas-Server-Id"),
                exchange.getRequestHeaders().getFirst("X-Edolas-Timestamp"),
                exchange.getRequestHeaders().getFirst("X-Edolas-Nonce"),
                exchange.getRequestHeaders().getFirst("X-Edolas-Signature")
            ));
            byte[] response = (requestCount.getAndIncrement() == 0
                ? "{\"ok\":true,\"delivery\":{\"deliveryId\":42,\"claimToken\":\"claim-token-01234567890123456789012345678901\",\"command\":\"lp user QuocBaooo parent add vip\"}}"
                : "{\"ok\":true}").getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(requests.size() == 1 ? 200 : 202, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();

        String secret = "0123456789abcdef0123456789abcdef";
        var config = TelemetryConfig.from(Map.ofEntries(
            Map.entry("server-id", "survival-01"), Map.entry("group", "survival"), Map.entry("display-name", "Survival 01"),
            Map.entry("endpoint", "http://127.0.0.1/telemetry"), Map.entry("delivery-endpoint", "http://127.0.0.1:" + server.getAddress().getPort() + "/deliveries"),
            Map.entry("api-key", secret), Map.entry("interval-seconds", 10), Map.entry("delivery-interval-seconds", 5),
            Map.entry("connect-timeout-seconds", 5), Map.entry("request-timeout-seconds", 8), Map.entry("critical-plugins", List.of("LuckPerms"))
        ));

        try (CommandDeliveryClient client = CommandDeliveryClient.create(config)) {
            CommandDelivery delivery = client.claim().orElseThrow();
            client.complete(delivery.deliveryId(), delivery.claimToken(), true, "Command accepted");
        } finally {
            server.stop(0);
        }

        assertEquals(2, requests.size());
        assertEquals("{\"schemaVersion\":1,\"action\":\"claim\"}", requests.getFirst().body());
        assertEquals("{\"schemaVersion\":1,\"action\":\"complete\",\"deliveryId\":42,\"claimToken\":\"claim-token-01234567890123456789012345678901\",\"success\":true,\"output\":\"Command accepted\"}", requests.get(1).body());
        for (CapturedRequest request : requests) {
            assertEquals("survival-01", request.serverId());
            String canonical = RequestSigner.canonical(request.serverId(), request.timestamp(), request.nonce(), request.body());
            assertEquals(RequestSigner.signature(secret, canonical), request.signature());
        }
    }

    private record CapturedRequest(String body, String serverId, String timestamp, String nonce, String signature) {}
}
