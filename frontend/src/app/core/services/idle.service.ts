import { Injectable, NgZone } from '@angular/core';
import { fromEvent, merge, Observable, Subject, Subscription, timer } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdleService {
  private idleTimeout = 3 * 60 * 1000; // 3 minutes en millisecondes
  private activityEvents$: Observable<any>;
  private stopTimer$ = new Subject<void>();
  private subscription?: Subscription;

  constructor(private authService: AuthService, private ngZone: NgZone) {
    this.activityEvents$ = merge(
      fromEvent(window, 'mousemove'),
      fromEvent(window, 'mousedown'),
      fromEvent(window, 'keydown'),
      fromEvent(window, 'scroll'),
      fromEvent(window, 'touchstart')
    );
  }

  startMonitoring(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    // On utilise NgZone pour s'assurer que le timer n'impacte pas les performances
    // et qu'on revient dans la zone Angular pour le logout
    this.ngZone.runOutsideAngular(() => {
      this.subscription = this.activityEvents$.pipe(
        switchMap(() => timer(this.idleTimeout)),
        takeUntil(this.stopTimer$)
      ).subscribe(() => {
        this.ngZone.run(() => {
          if (this.authService.isLoggedIn) {
            console.log('Déconnexion automatique pour inactivité (3 minutes)');
            this.authService.logout();
          }
        });
      });
    });
  }

  stopMonitoring(): void {
    this.stopTimer$.next();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
