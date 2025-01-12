/**
 * Copyright 2023 The Ground Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {getDownloadURL, getStorage, ref} from 'firebase/storage';
import {List} from 'immutable';
import {Subscription} from 'rxjs';

import {Result} from 'app/models/submission/result.model';
import {Submission} from 'app/models/submission/submission.model';
import {Option} from 'app/models/task/option.model';
import {Task, TaskType} from 'app/models/task/task.model';
import {NavigationService} from 'app/services/navigation/navigation.service';
import {SubmissionService} from 'app/services/submission/submission.service';

@Component({
  selector: 'submission-panel',
  templateUrl: './submission-panel.component.html',
  styleUrls: ['./submission-panel.component.scss'],
})
export class SubmissionPanelComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();

  @Input() submissionId!: string;
  submission: Submission | null = null;
  tasks?: List<Task>;
  selectedTaskId: string | null = null;
  storage = getStorage();
  firebaseURLs = new Map<string, string>();

  public taskType = TaskType;

  constructor(
    private submissionService: SubmissionService,
    private navigationService: NavigationService
  ) {}

  ngOnInit() {
    this.submissionService.selectSubmission(this.submissionId);
    this.subscription.add(
      this.submissionService.getSelectedSubmission$().subscribe(submission => {
        if (submission instanceof Submission) {
          this.submission = submission;
          this.tasks = submission.job
            ?.getTasksSorted()
            .filter(task => !task.addLoiTask);
          // Get image URL upon initialization to not send Firebase requests multiple times
          this.getFirebaseImageURLs();
        }
      })
    );
    this.subscription.add(
      this.navigationService.getTaskId$().subscribe(taskId => {
        this.selectedTaskId = taskId;
      })
    );
  }

  getFirebaseImageURLs() {
    this.tasks?.forEach(task => {
      if (task.type === this.taskType.PHOTO) {
        const submissionImage = this.getTaskSubmissionResult(task)!
          .value as string;
        const imageRef = ref(this.storage, submissionImage);
        getDownloadURL(imageRef).then(url => {
          this.firebaseURLs.set(submissionImage, url);
        });
      }
    });
  }

  navigateToSubmissionList() {
    this.navigationService.selectLocationOfInterest(this.submission!.loiId);
  }

  getTaskSubmissionResult({id: taskId}: Task): Result | undefined {
    return this.submission?.data.get(taskId);
  }

  getTaskMultipleChoiceSelections(task: Task): List<Option> {
    return this.getTaskSubmissionResult(task)!.value as List<Option>;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
