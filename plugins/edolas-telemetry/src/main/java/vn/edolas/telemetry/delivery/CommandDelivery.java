package vn.edolas.telemetry.delivery;

import java.util.Objects;
import java.util.regex.Pattern;

public record CommandDelivery(long deliveryId, String claimToken, String command) {
    private static final Pattern CLAIM_TOKEN = Pattern.compile("^[A-Za-z0-9_-]{32,64}$");

    public CommandDelivery {
        if (deliveryId < 1 || !CLAIM_TOKEN.matcher(Objects.requireNonNull(claimToken)).matches()) {
            throw new IllegalArgumentException("Delivery response is invalid.");
        }
        if (Objects.requireNonNull(command).isBlank() || command.length() > 8_192) {
            throw new IllegalArgumentException("Delivery response is invalid.");
        }
    }
}
