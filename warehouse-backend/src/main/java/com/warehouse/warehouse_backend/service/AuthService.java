package com.warehouse.warehouse_backend.service;

import com.warehouse.warehouse_backend.model.Role;
import com.warehouse.warehouse_backend.model.User;
import com.warehouse.warehouse_backend.repository.UserRepository;
import com.warehouse.warehouse_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender; 

    private static final String EMAIL_PATTERN = "^[A-Za-z0-9+_.-]+@(.+)$";
    private static final String MASTER_USERNAME = "gumsimi2"; 

    public Map<String, Object> login(String username, String password, String requestedRole) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
        );

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User tidak ditemukan"));

        if (requestedRole != null && !user.getRole().name().equalsIgnoreCase(requestedRole)) {
            if (requestedRole.equalsIgnoreCase("ADMIN")) {
                throw new RuntimeException("Akses ditolak! Anda bukan Administrator.");
            } else {
                throw new RuntimeException("Akses ditolak!");
            }
        }

        if (!user.isVerified()) {
            throw new RuntimeException("Akun belum diverifikasi. Silakan cek email Anda.");
        }

        String token = jwtUtil.generateToken(username);
        Map<String, Object> response = new HashMap<>();

        
        if (username.equalsIgnoreCase(MASTER_USERNAME)) { 
            response.put("token", token);
            response.put("id", user.getId()); 
            response.put("username", user.getUsername());
            response.put("namaLengkap", user.getNamaLengkap());
            response.put("role", user.getRole());
            
            
            response.put("requireOtp", false); 
            response.put("message", "Login Master berhasil.");
            
            return response;
        }

        
        String otp = generateOTP();
        user.setOtp(otp);
        userRepository.save(user);

        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            sendOtpEmail(user.getEmail(), otp);
            response.put("message", "OTP telah dikirim ke email.");
        } else {
            System.out.println("=================================================");
            System.out.println("[PERINGATAN] Akun " + username + " tidak memiliki email di database!");
            System.out.println("[KODE OTP] Masukkan kode ini di web: " + otp);
            System.out.println("=================================================");
            response.put("message", "Email kosong! Cek Terminal/Console Java untuk melihat kode OTP.");
        }

        response.put("token", token);
        response.put("id", user.getId()); 
        response.put("username", user.getUsername());
        response.put("namaLengkap", user.getNamaLengkap());
        response.put("role", user.getRole());
        response.put("email", user.getEmail()); 
        
        response.put("requireOtp", true); 

        return response;
    }

    
    public Map<String, Object> register(String fullName, String email, String username, String password) {
        Map<String, Object> response = new HashMap<>();

        if (!Pattern.compile(EMAIL_PATTERN).matcher(email).matches()) {
            response.put("status", "error");
            response.put("message", "Format email tidak valid!");
            return response;
        }

        if (userRepository.findByUsername(username).isPresent()) {
            response.put("status", "error");
            response.put("message", "Username sudah terdaftar!");
            return response;
        }
        if (userRepository.findByEmail(email).isPresent()) {
            response.put("status", "error");
            response.put("message", "Email sudah terdaftar!");
            return response;
        }

        User newUser = new User();
        newUser.setNamaLengkap(fullName);
        newUser.setEmail(email);
        newUser.setUsername(username);
        newUser.setPassword(passwordEncoder.encode(password));
        newUser.setRole(Role.PETUGAS_GUDANG); 
        newUser.setVerified(false);
        
        String otp = generateOTP();
        newUser.setOtp(otp);
        userRepository.save(newUser);

        sendOtpEmail(email, otp);

        response.put("status", "success");
        response.put("message", "Registrasi berhasil! Silakan cek email untuk kode OTP.");
        return response;
    }

    
    public Map<String, Object> verifyOtp(String email, String otp) {
        Map<String, Object> response = new HashMap<>();

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(email); 
        }

        if (userOpt.isEmpty()) {
            response.put("status", "error");
            response.put("message", "User tidak ditemukan!");
            return response;
        }

        User user = userOpt.get();

        if (user.getOtp() != null && user.getOtp().equals(otp)) {
            user.setVerified(true); 
            user.setOtp(null);      
            userRepository.save(user);

            response.put("status", "success");
            response.put("message", "Verifikasi berhasil!");
            
            response.put("id", user.getId());
            response.put("token", jwtUtil.generateToken(user.getUsername()));
            response.put("username", user.getUsername());
            response.put("namaLengkap", user.getNamaLengkap());
            response.put("role", user.getRole());
        } else {
            response.put("status", "error");
            response.put("message", "Kode OTP salah atau sudah kedaluwarsa!");
        }

        return response;
    }

    
    public Map<String, Object> resendOtp(String emailOrUsername) {
        Map<String, Object> response = new HashMap<>();

        Optional<User> userOpt = userRepository.findByEmail(emailOrUsername);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(emailOrUsername);
        }

        if (userOpt.isEmpty()) {
            response.put("status", "error");
            response.put("message", "User tidak ditemukan!");
            return response;
        }

        User user = userOpt.get();
        String newOtp = generateOTP();
        user.setOtp(newOtp);
        userRepository.save(user);

        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            sendOtpEmail(user.getEmail(), newOtp);
            response.put("message", "Kode OTP baru telah dikirim ke email Anda.");
        } else {
            System.out.println("=================================================");
            System.out.println("[PERINGATAN] Akun " + user.getUsername() + " tidak punya email!");
            System.out.println("[KODE OTP RESEND] Masukkan kode ini di web: " + newOtp);
            System.out.println("=================================================");
            response.put("message", "Email kosong! Cek Terminal/Console Java untuk melihat kode OTP.");
        }

        response.put("status", "success");
        return response;
    }

    
    
    

    public Map<String, Object> forgotPassword(String username) {
        Map<String, Object> response = new HashMap<>();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            response.put("status", "error");
            response.put("message", "Username tidak ditemukan!");
            return response;
        }

        User user = userOpt.get();
        String otp = generateOTP();
        user.setOtp(otp);
        userRepository.save(user);

        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            sendForgotPasswordEmail(user.getEmail(), otp);
            response.put("message", "OTP untuk reset password telah dikirim.");
        } else {
            System.out.println("=================================================");
            System.out.println("[PERINGATAN LUPA PASSWORD] Akun " + user.getUsername() + " tidak punya email!");
            System.out.println("[KODE OTP RESET] Masukkan kode ini di web: " + otp);
            System.out.println("=================================================");
            response.put("message", "Email kosong! Cek Terminal/Console Java untuk OTP.");
        }

        response.put("status", "success");
        response.put("email", user.getEmail()); 
        response.put("username", user.getUsername());
        return response;
    }

    public Map<String, Object> verifyForgotOtp(String emailOrUsername, String otp) {
        Map<String, Object> response = new HashMap<>();
        Optional<User> userOpt = userRepository.findByEmail(emailOrUsername);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(emailOrUsername);
        }

        if (userOpt.isEmpty()) {
            response.put("status", "error");
            response.put("message", "User tidak ditemukan!");
            return response;
        }

        User user = userOpt.get();

        if (user.getOtp() != null && user.getOtp().equals(otp)) {
            response.put("status", "success");
            response.put("message", "Verifikasi OTP berhasil, silakan masukkan password baru.");
        } else {
            response.put("status", "error");
            response.put("message", "Kode OTP salah atau sudah kedaluwarsa!");
        }

        return response;
    }

    @Transactional
    public Map<String, Object> resetPassword(String username, String otp, String newPassword) {
        Map<String, Object> response = new HashMap<>();
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            response.put("status", "error");
            response.put("message", "User tidak ditemukan!");
            return response;
        }

        User user = userOpt.get();

        if (user.getOtp() != null && user.getOtp().equals(otp)) {
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setOtp(null); 
            userRepository.save(user);

            response.put("status", "success");
            response.put("message", "Password berhasil diubah!");
        } else {
            response.put("status", "error");
            response.put("message", "Akses tidak sah atau OTP tidak valid!");
        }

        return response;
    }

    
    private String generateOTP() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    private void sendOtpEmail(String to, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Verifikasi Akun Inventaris Gudang");
        message.setText("Halo,\n\nKode OTP Anda adalah: " + otp + "\n\nJangan berikan kode ini kepada siapa pun.");
        mailSender.send(message);
    }

    private void sendForgotPasswordEmail(String to, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Reset Password Akun Inventaris Gudang");
        message.setText("Halo,\n\nKami menerima permintaan untuk mereset password Anda. Kode OTP Anda adalah: " + otp + "\n\nJika Anda tidak meminta ini, abaikan email ini dan pastikan akun Anda aman.");
        mailSender.send(message);
    }
}