import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .auth-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #f8fafc; padding: 1rem;
    }
    .auth-card {
      background: #fff; border-radius: 1.25rem; padding: 2.5rem 2rem;
      width: 100%; max-width: 420px;
      box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
      animation: fadeIn .4s ease;
    }
    @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    .logo-box {
      width: 56px; height: 56px; border-radius: 14px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem; box-shadow: 0 4px 12px rgba(217,119,6,.25);
      transition: transform .3s;
    }
    .logo-box:hover { transform: scale(1.05); }
    .auth-title { text-align:center; font-size:1.3rem; font-weight:700; color:#1e293b; margin-bottom:.25rem; }
    .auth-sub { text-align:center; font-size:.8rem; color:#94a3b8; margin-bottom:1.5rem; line-height:1.45; }
    .field-label { display:block; font-size:.75rem; font-weight:600; color:#475569; margin-bottom:.35rem; }
    .auth-input {
      width:100%; padding:.65rem .9rem; border:1.5px solid #e2e8f0; border-radius:.6rem;
      font-size:.88rem; color:#1e293b; background:#fff; outline:none;
      transition: border-color .2s, box-shadow .2s; box-sizing:border-box;
    }
    .auth-input::placeholder { color:#cbd5e1; }
    .auth-input:focus { border-color:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.1); }
    .auth-input.invalid { border-color:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.08); }
    .pwd-wrap { position:relative; }
    .pwd-toggle {
      position:absolute; right:.7rem; top:50%; transform:translateY(-50%);
      background:none; border:none; cursor:pointer; color:#94a3b8; transition:color .2s;
    }
    .pwd-toggle:hover { color:#475569; }
    .strength-bar { display:flex; gap:4px; margin-top:.4rem; }
    .strength-seg { flex:1; height:3px; border-radius:99px; background:#e2e8f0; transition:background .3s; }
    .seg-weak   { background:#ef4444; }
    .seg-medium { background:#f59e0b; }
    .seg-strong { background:#10b981; }
    .strength-text { font-size:.7rem; color:#94a3b8; margin-top:.2rem; }
    .info-box {
      display:flex; align-items:center; gap:.5rem;
      background:#fffbeb; border:1px solid #fde68a; color:#92400e;
      font-size:.78rem; border-radius:.5rem; padding:.55rem .8rem; margin-bottom:1.2rem;
    }
    .auth-btn {
      width:100%; padding:.7rem; background:#f59e0b; border:none; border-radius:.6rem;
      color:#fff; font-weight:600; font-size:.9rem; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:.45rem;
      transition: background .2s, transform .15s, box-shadow .2s;
    }
    .auth-btn:hover:not(:disabled) { background:#d97706; box-shadow:0 4px 12px rgba(217,119,6,.25); transform:translateY(-1px); }
    .auth-btn:disabled { opacity:.55; cursor:not-allowed; }
    .error-box {
      display:flex; align-items:center; gap:.5rem;
      background:#fef2f2; border:1px solid #fecaca; color:#dc2626;
      font-size:.82rem; border-radius:.5rem; padding:.6rem .9rem; margin-bottom:1rem;
      animation: shake .35s ease;
    }
    @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
    .hint-text { color:#ef4444; font-size:.73rem; margin-top:.25rem; }
    .mini-spinner {
      width:16px; height:16px; border:2px solid rgba(255,255,255,.3);
      border-top-color:#fff; border-radius:50%; animation:spin .5s linear infinite;
    }
    @keyframes spin { to { transform:rotate(360deg); } }
    input::-ms-reveal, input::-ms-clear { display: none; }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="logo-box">
          <i class="fas fa-shield-alt" style="color:#fff;font-size:1.3rem"></i>
        </div>
        <h1 class="auth-title">Nouveau mot de passe</h1>
        <p class="auth-sub">Première connexion détectée — choisissez un mot de passe sécurisé.</p>

        <div class="info-box">
          <i class="fas fa-info-circle"></i>
          <span>Le mot de passe doit comporter au moins 6 caractères.</span>
        </div>

        <div *ngIf="error" class="error-box">
          <i class="fas fa-exclamation-circle"></i> {{error}}
        </div>

        <div style="margin-bottom:1rem">
          <label class="field-label">Nouveau mot de passe</label>
          <div class="pwd-wrap">
            <input [type]="showPwd ? 'text' : 'password'"
              [class]="'auth-input' + (submitted && !isPasswordValid() ? ' invalid' : '')"
              style="padding-right:2.5rem"
              [(ngModel)]="newPassword" placeholder="Minimum 6 caractères"
              (ngModelChange)="onPasswordChange()" (keyup.enter)="changePassword()">
            <button type="button" class="pwd-toggle" (click)="showPwd=!showPwd">
              <i class="fas" [class.fa-eye]="!showPwd" [class.fa-eye-slash]="showPwd"></i>
            </button>
          </div>
          <div class="strength-bar" *ngIf="newPassword.length > 0">
            <div class="strength-seg" [class]="strength >= 1 ? 'seg-' + strengthLabel : ''"></div>
            <div class="strength-seg" [class]="strength >= 2 ? 'seg-' + strengthLabel : ''"></div>
            <div class="strength-seg" [class]="strength >= 3 ? 'seg-' + strengthLabel : ''"></div>
            <div class="strength-seg" [class]="strength >= 4 ? 'seg-' + strengthLabel : ''"></div>
          </div>
          <p *ngIf="newPassword.length > 0" class="strength-text">{{strengthText}}</p>
        </div>

        <div style="margin-bottom:1.5rem">
          <label class="field-label">Confirmer le mot de passe</label>
          <input type="password"
            [class]="'auth-input' + (submitted && newPassword !== confirmPassword ? ' invalid' : '')"
            [(ngModel)]="confirmPassword" placeholder="Répétez votre mot de passe"
            (keyup.enter)="changePassword()">
          <p *ngIf="submitted && newPassword !== confirmPassword && confirmPassword.length > 0" class="hint-text">
            <i class="fas fa-times-circle"></i> Les mots de passe ne correspondent pas
          </p>
        </div>

        <button class="auth-btn" (click)="changePassword()" [disabled]="loading">
          <div *ngIf="loading" class="mini-spinner"></div>
          <ng-container *ngIf="!loading"><i class="fas fa-check"></i> Enregistrer et continuer</ng-container>
        </button>
      </div>
    </div>
  `
})
export class ChangePasswordComponent {
  newPassword = '';
  confirmPassword = '';
  error = '';
  loading = false;
  submitted = false;
  showPwd = false;
  strength = 0;
  strengthLabel = 'weak';
  strengthText = '';

  constructor(private auth: AuthService, private router: Router) {}

  isPasswordValid(): boolean {
    return this.newPassword.length >= 6;
  }

  onPasswordChange() {
    const p = this.newPassword;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p) || /[^A-Za-z0-9]/.test(p)) score++;
    this.strength = score;
    if (score <= 1) { this.strengthLabel = 'weak'; this.strengthText = 'Faible'; }
    else if (score <= 2) { this.strengthLabel = 'medium'; this.strengthText = 'Moyen'; }
    else { this.strengthLabel = 'strong'; this.strengthText = 'Fort'; }
  }

  changePassword() {
    this.submitted = true;
    if (!this.isPasswordValid()) {
      this.error = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Les mots de passe ne correspondent pas';
      return;
    }

    this.loading = true;
    this.error = '';
    this.auth.firstLogin(this.newPassword).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => {
        this.loading = false;
        this.error = err.error?.error || err.error?.message || 'Une erreur est survenue';
      }
    });
  }
}
