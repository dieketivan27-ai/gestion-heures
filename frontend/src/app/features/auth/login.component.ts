import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    .auth-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #f8fafc; padding: 1rem;
    }
    .auth-card {
      background: #fff; border-radius: 1.25rem; padding: 2.5rem 2rem;
      width: 100%; max-width: 400px;
      box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
      animation: fadeIn .4s ease;
    }
    @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    .logo-box {
      width: 56px; height: 56px; border-radius: 14px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem; box-shadow: 0 4px 12px rgba(37,99,235,.25);
      transition: transform .3s;
    }
    .logo-box:hover { transform: scale(1.05); }
    .auth-title { text-align:center; font-size:1.3rem; font-weight:700; color:#1e293b; margin-bottom:.25rem; }
    .auth-sub { text-align:center; font-size:.8rem; color:#94a3b8; margin-bottom:1.8rem; }
    .field-label { display:block; font-size:.75rem; font-weight:600; color:#475569; margin-bottom:.35rem; }
    .auth-input {
      width:100%; padding:.65rem .9rem; border:1.5px solid #e2e8f0; border-radius:.6rem;
      font-size:.88rem; color:#1e293b; background:#fff; outline:none;
      transition: border-color .2s, box-shadow .2s; box-sizing:border-box;
    }
    .auth-input::placeholder { color:#cbd5e1; }
    .auth-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
    .auth-input.invalid { border-color:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.08); }
    .pwd-wrap { position:relative; }
    .pwd-toggle {
      position:absolute; right:.7rem; top:50%; transform:translateY(-50%);
      background:none; border:none; cursor:pointer; color:#94a3b8; transition:color .2s;
    }
    .pwd-toggle:hover { color:#475569; }
    .auth-btn {
      width:100%; padding:.7rem; background:#3b82f6; border:none; border-radius:.6rem;
      color:#fff; font-weight:600; font-size:.9rem; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:.45rem;
      transition: background .2s, transform .15s, box-shadow .2s;
    }
    .auth-btn:hover:not(:disabled) { background:#2563eb; box-shadow:0 4px 12px rgba(37,99,235,.25); transform:translateY(-1px); }
    .auth-btn:active:not(:disabled) { transform:translateY(0); }
    .auth-btn:disabled { opacity:.55; cursor:not-allowed; }
    .error-box {
      display:flex; align-items:center; gap:.5rem;
      background:#fef2f2; border:1px solid #fecaca; color:#dc2626;
      font-size:.82rem; border-radius:.5rem; padding:.6rem .9rem; margin-bottom:1rem;
      animation: shake .35s ease;
    }
    @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
    .auth-link { color:#3b82f6; font-size:.78rem; font-weight:500; text-decoration:none; transition:color .2s; }
    .auth-link:hover { color:#1d4ed8; }
    .mini-spinner {
      width:16px; height:16px; border:2px solid rgba(255,255,255,.3);
      border-top-color:#fff; border-radius:50%; animation:spin .5s linear infinite;
    }
    @keyframes spin { to { transform:rotate(360deg); } }
    input::-ms-reveal, input::-ms-clear { display: none; }

    .demo-section {
      margin-top: 1.8rem;
      padding-top: 1.5rem;
      border-top: 1px dashed #e2e8f0;
    }
    .demo-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: center;
    }
    .demo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8rem;
    }
    .demo-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.8rem 0.5rem;
      background: #ffffff;
      border: 1.5px solid #f1f5f9;
      border-radius: 0.8rem;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      text-align: center;
    }
    .demo-btn:hover {
      background: #f8fafc;
      border-color: #3b82f6;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59,130,246,0.08);
    }
    .demo-btn i {
      font-size: 1.1rem;
      color: #3b82f6;
      margin-bottom: 0.4rem;
    }
    .demo-btn-role {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.1rem;
    }
    .demo-btn-mail {
      display: block;
      font-size: 0.65rem;
      color: #94a3b8;
    }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="logo-box">
          <i class="fas fa-graduation-cap" style="color:#fff;font-size:1.4rem"></i>
        </div>
        <h1 class="auth-title">GestionHeures</h1>
        <p class="auth-sub">Gestion des heures des enseignants du supérieur</p>

        <div *ngIf="error" class="error-box">
          <i class="fas fa-exclamation-circle"></i> {{error}}
        </div>

        <div style="margin-bottom:1rem">
          <label class="field-label">Adresse email</label>
          <input type="email"
            [class]="'auth-input' + (submitted && !email ? ' invalid' : '')"
            [(ngModel)]="email" placeholder="exemple@univ.ci" (keyup.enter)="login()">
        </div>

        <div style="margin-bottom:1.5rem">
          <label class="field-label">Mot de passe</label>
          <div class="pwd-wrap">
            <input [type]="showPwd ? 'text' : 'password'"
              [class]="'auth-input' + (submitted && !password ? ' invalid' : '')"
              style="padding-right:2.5rem"
              [(ngModel)]="password" placeholder="••••••••" (keyup.enter)="login()">
            <button type="button" class="pwd-toggle" (click)="showPwd=!showPwd">
              <i class="fas" [class.fa-eye]="!showPwd" [class.fa-eye-slash]="showPwd"></i>
            </button>
          </div>
        </div>

        <button class="auth-btn" (click)="login()" [disabled]="loading">
          <div *ngIf="loading" class="mini-spinner"></div>
          <ng-container *ngIf="!loading"><i class="fas fa-sign-in-alt"></i> Connexion</ng-container>
        </button>

        <div class="demo-section">
          <div class="demo-title">Accès rapide (Démo)</div>
          <div class="demo-grid">
            <button type="button" class="demo-btn" (click)="fillDemo('admin@univ.ci', 'Admin@1234')">
              <i class="fas fa-user-shield"></i>
              <span class="demo-btn-role">Administrateur</span>
              <span class="demo-btn-mail">admin&#64;univ.ci</span>
            </button>
            <button type="button" class="demo-btn" (click)="fillDemo('rh@univ.ci', 'Admin@1234')">
              <i class="fas fa-users-cog"></i>
              <span class="demo-btn-role">Service RH</span>
              <span class="demo-btn-mail">rh&#64;univ.ci</span>
            </button>
          </div>
        </div>

        <div style="text-align:center;margin-top:1.2rem">
          <a routerLink="/forgot-password" class="auth-link">Mot de passe oublié ?</a>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;
  submitted = false;
  showPwd = false;

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn) this.router.navigate(['/dashboard']);
  }

  fillDemo(email: string, pwd: string) {
    this.email = email;
    this.password = pwd;
    this.error = '';
    this.submitted = false;
  }

  login() {
    this.submitted = true;
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        if (res.user.must_change_password) {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.error || err.error?.message || 'Erreur de connexion';
      }
    });
  }
}
