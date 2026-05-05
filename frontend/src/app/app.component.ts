import { Component, OnInit, NgZone } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IdleService } from './core/services/idle.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent implements OnInit {
  constructor(
    private idleService: IdleService,
    private http: HttpClient,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.idleService.startMonitoring();
    
    // Check for app updates every 15 seconds
    this.ngZone.runOutsideAngular(() => {
      setInterval(() => {
        this.http.get(`${environment.apiUrl}/health`, { observe: 'response' }).subscribe({
          error: () => {} // ignore connection errors
        });
      }, 15000);
    });
  }
}

