package vn.edolas.telemetry.security;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RequestSignerTest {
    @Test
    void signsTheSameCanonicalVectorAsTheWebsite() {
        String canonical = RequestSigner.canonical("survival-01", "1786636800", "abc1234567890xyz", "{}");

        assertEquals("v1\nsurvival-01\n1786636800\nabc1234567890xyz\n44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a", canonical);
        assertEquals("56a9417591c45d1bcfc4496b9ebadeb499830767180254bbfc8b4b266bbd44df", RequestSigner.hmacSha256("0123456789abcdef0123456789abcdef", canonical));
        assertEquals("v1=56a9417591c45d1bcfc4496b9ebadeb499830767180254bbfc8b4b266bbd44df", RequestSigner.signature("0123456789abcdef0123456789abcdef", canonical));
    }
}
